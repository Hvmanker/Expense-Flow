# SQLite Database Schema Specification (Mobile)

## Database Engine
* **Database:** SQLite 3.x
* **Driver:** `expo-sqlite`
* **Target:** Expo React Native (iOS & Android)

---

## Column Separation: `status` vs `sync_status`

The `local_transactions` table cleanly separates the **Domain Lifecycle Status** (`status`) from the **Sync Engine Lifecycle Status** (`sync_status`):

* **`status` (Domain Lifecycle):**
  - `CAPTURED`: Ingested from SMS webhook, awaiting parser enrichment.
  - `PENDING_CATEGORY`: Payment parsed; awaiting user confirmation in Inbox.
  - `COMPLETED`: User confirmed category/purpose.
  - `IGNORED`: Dismissed by user.
  - `ARCHIVED`: Soft deleted.

* **`sync_status` (Synchronization Engine Lifecycle):**
  - `SYNCED`: Identical on local SQLite and remote MongoDB.
  - `PENDING_UPLOAD`: Modified locally offline; queued in `pending_sync_queue`.
  - `FAILED`: In-flight upload failed; waiting for backoff retry.
  - `CONFLICT`: Timestamp conflict detected during sync push; awaiting Last-Write-Wins merge.

---

## Schema DDL

```sql
PRAGMA foreign_keys = ON;

-- 1. Local Transactions Mirror Table
CREATE TABLE IF NOT EXISTS local_transactions (
    id TEXT PRIMARY KEY NOT NULL,
    fingerprint TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    merchant TEXT NOT NULL,
    merchant_id TEXT,
    bank TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    account_masked TEXT,
    reference TEXT,
    occurred_at TEXT NOT NULL,
    category TEXT,
    purpose TEXT,
    notes TEXT,
    tags TEXT DEFAULT '[]', -- JSON string array
    ai_suggestion TEXT,    -- JSON string object
    ai_confidence REAL,
    status TEXT NOT NULL DEFAULT 'PENDING_CATEGORY',
    sync_status TEXT NOT NULL DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indexes for Fast Local UI Queries
CREATE INDEX IF NOT EXISTS idx_local_tx_occurred ON local_transactions(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_local_tx_status ON local_transactions(status);
CREATE INDEX IF NOT EXISTS idx_local_tx_sync_status ON local_transactions(sync_status);
CREATE INDEX IF NOT EXISTS idx_local_tx_category ON local_transactions(category);

-- 2. Pending Sync Queue
CREATE TABLE IF NOT EXISTS pending_sync_queue (
    queue_id TEXT PRIMARY KEY NOT NULL,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- TRANSACTION | CATEGORY | BUDGET
    operation TEXT NOT NULL,    -- CREATE | UPDATE | DELETE
    payload TEXT NOT NULL,      -- JSON payload string
    client_timestamp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_UPLOAD',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON pending_sync_queue(status);

-- 3. Local Categories Cache Table
CREATE TABLE IF NOT EXISTS local_categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL
);

-- 4. Local Merchants Cache Table
CREATE TABLE IF NOT EXISTS local_merchants (
    id TEXT PRIMARY KEY NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE,
    default_category TEXT NOT NULL
);
```
