---
title: "Offline Sync Architecture Specification"
version: "1.1.0"
status: "APPROVED"
last_updated: "2026-08-29"
author: "Antigravity Data Architecture Team"
---

# Offline Sync Architecture Specification

## 1. Overview
ExpenseFlow AI V1.1 operates on an **Offline-First Storage Engine**. All client reads and writes execute against a local SQLite database (`expo-sqlite`). Background network sync processes flush offline queue mutations to MongoDB when internet connectivity is available.

---

## 2. Scope
* **Included in V1.1:** Local SQLite schemas (`local_transactions`, `pending_sync_queue`, `local_categories`, `local_merchants`), `status` vs `sync_status` separation, queue state machine, exponential backoff retry lifecycle, delta push/pull synchronization, timestamp Last-Write-Wins (LWW) conflict resolution, and reconnect trigger.
* **Excluded in V1.1:** Peer-to-peer device mesh sync.

---

## 3. Responsibilities
* **Mobile Client (`apps/mobile`):** Performs local SQLite reads/writes, manages deep-link fallback `expenseflow://capture`, and maintains `pending_sync_queue`.
* **Sync Controller (`apps/api`):** Processes `POST /api/v1/sync/push` and `POST /api/v1/sync/pull` payloads inside Mongoose transactions and calculates delta pull responses.

---

## 4. Column Separation: `status` vs `sync_status`

The `local_transactions` table cleanly separates **Domain Lifecycle Status** (`status`) from **Sync Engine Lifecycle Status** (`sync_status`):

* **`status` (Domain Lifecycle):**
  - `CAPTURED`: Raw payment SMS received.
  - `PENDING_CATEGORY`: Parsed; awaiting user Inbox confirmation.
  - `COMPLETED`: User confirmed category & purpose.
  - `IGNORED`: Dismissed by user.
  - `ARCHIVED`: Soft deleted.

* **`sync_status` (Sync Engine Lifecycle):**
  - `SYNCED`: Identical on local SQLite and remote MongoDB.
  - `PENDING_UPLOAD`: Modified locally offline; queued in `pending_sync_queue`.
  - `FAILED`: In-flight upload failed; waiting for backoff retry.
  - `CONFLICT`: Timestamp conflict detected; resolved via Last-Write-Wins.

---

## 5. Offline Sync Queue State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING_UPLOAD: Mutation executed offline in SQLite
    PENDING_UPLOAD --> UPLOADING: Network ONLINE & Sync Manager triggers batch push
    
    UPLOADING --> SYNCED: API returns HTTP 200 OK (Item removed from queue)
    UPLOADING --> FAILED: Network Timeout or Validation Error
    
    FAILED --> UPLOADING: Exponential Backoff Timer Expires (retry_count < 5)
    FAILED --> FAILED: Max Retries Exceeded (Manual user retry required)
    
    SYNCED --> [*]
```

---

## 6. Exponential Backoff Retry Policy

When an in-flight sync push request fails, the Background Sync Manager applies an exponential backoff formula:

\[ t_{\text{retry}} = 2^n \times 1\text{ second} + \text{jitter} \]

| Retry Count ($n$) | Backoff Delay | Action |
| :---: | :--- | :--- |
| **0** | $1\text{ sec}$ | Initial automatic retry upon network reconnect. |
| **1** | $2\text{ sec}$ | Second attempt. |
| **2** | $4\text{ sec}$ | Third attempt. |
| **3** | $8\text{ sec}$ | Fourth attempt. |
| **4** | $16\text{ sec}$ | Fifth attempt. |
| **5 (Max)** | $32\text{ sec}$ | Queue status set to `FAILED`. UI displays "Sync Error — Tap to Retry" badge in Settings. |

---

## 7. SQLite Queue Payload Example

The `pending_sync_queue` stores mutation payloads serialized as JSON strings:

```json
{
  "queueId": "q_98712345-a1b2-4c3d-8e9f-123456789abc",
  "entityId": "tx_65d8b1e42a9f8c12b704901f",
  "entityType": "TRANSACTION",
  "operation": "UPDATE",
  "payload": {
    "category": "Food & Dining",
    "purpose": "Client coffee meeting",
    "notes": "Discussed Q3 project roadmap",
    "status": "COMPLETED"
  },
  "clientTimestamp": "2026-08-29T12:05:00.000Z",
  "status": "PENDING_UPLOAD",
  "retryCount": 0
}
```

---

## 8. Last-Write-Wins (LWW) Conflict Resolution Example

If a transaction is edited locally on mobile offline while simultaneously updated on the Web Dashboard:

1. **Mobile Mutation (Offline):** `clientTimestamp = "2026-08-29T12:05:00.000Z"`, `category = "Food & Dining"`.
2. **Web Mutation (Online):** `serverUpdatedAt = "2026-08-29T12:04:00.000Z"`, `category = "Office Expenses"`.
3. **Reconciliation Logic:** The API Gateway compares `clientTimestamp` ($12:05:00$) against `serverUpdatedAt` ($12:04:00$).
4. **Resolution:** Since $12:05:00 > 12:04:00$, the Mobile edit wins. The document is updated to `"Food & Dining"` and an event log entry `ConflictResolvedLWW` is stored.

---

## 9. Queue Lifecycle & Sync Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant App as Mobile App UI
    participant SQLite as Local SQLite DB
    participant Queue as pending_sync_queue
    participant API as Express API (/sync/push)
    participant Mongo as MongoDB Storage

    App->>SQLite: User categorizes transaction offline
    SQLite->>SQLite: UPDATE local_transactions SET status='COMPLETED', sync_status='PENDING_UPLOAD'
    SQLite->>Queue: INSERT INTO pending_sync_queue (op: 'UPDATE', status: 'PENDING_UPLOAD')
    
    Note over App: Network Connectivity Restored (ONLINE)
    App->>Queue: SELECT * WHERE status = 'PENDING_UPLOAD'
    Queue-->>App: Return queue items array
    App->>API: POST /api/v1/sync/push { changes: [...] }
    
    API->>Mongo: Start Transaction Session
    loop For each change item
        API->>Mongo: Check server.updatedAt vs client_timestamp
        alt server.updatedAt <= client_timestamp
            API->>Mongo: Apply Mutation & Save
            API-->>App: Return SYNCED
        else Conflict Detected
            API->>API: Resolve via Last-Write-Wins (LWW)
            API-->>App: Return CONFLICT_RESOLVED + Merged Document
        end
    end
    API->>Mongo: Commit Transaction
    
    App->>SQLite: UPDATE local_transactions SET sync_status = 'SYNCED' WHERE id IN (...)
    App->>Queue: DELETE FROM pending_sync_queue WHERE queue_id IN (...)
    App->>API: POST /api/v1/sync/pull { lastSyncTimestamp }
    API->>Mongo: SELECT * WHERE updatedAt > lastSyncTimestamp
    API-->>App: Return Delta Objects
    App->>SQLite: Apply server deltas to local_transactions (sync_status = 'SYNCED')
```

---

## 10. Acceptance Criteria

### Feature Completion Checklist
- [x] SQLite DDL schemas (`local_transactions`, `pending_sync_queue`, `local_categories`, `local_merchants`) specified.
- [x] Clear separation of domain `status` vs sync `sync_status` documented.
- [x] Offline sync queue state machine diagram provided.
- [x] Exponential backoff retry policy table detailed.
- [x] SQLite queue payload JSON example provided.
- [x] Last-Write-Wins (LWW) conflict resolution example documented.

---

## 11. Future Improvements (V2 Upgrade Path)
* **CRDT Data Structures:** Conflict-Free Replicated Data Types for multi-device live offline merging.
