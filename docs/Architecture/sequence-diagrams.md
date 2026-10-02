# System Sequence Diagrams

This document details sequence flows across key product journeys.

---

## 1. SMS Capture to Inbox Processing Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User Payment
    participant SMS as Bank SMS Notification
    participant Shortcut as Apple Shortcuts Automation
    participant API as Express API Server
    participant Parser as @expenseflow/parser-engine
    participant Dedup as Duplicate Detection Engine
    participant DB as MongoDB Database
    participant Queue as BullMQ (Redis)
    participant AI as ai-worker (Ollama)
    participant Push as Expo Push Service
    participant Mobile as Mobile App (SQLite)

    User->>SMS: Pays ₹450 at Starbucks via UPI
    SMS->>Shortcut: Triggers Apple Shortcut on keyword match
    Shortcut->>Shortcut: Extract text, bank code, timestamp
    Shortcut->>API: POST /api/v1/capture/sms (X-Device-Token)
    API->>API: Authenticate Device Token
    API->>Parser: Parse SMS text (HDFCParser)
    Parser-->>API: Extracted { amount: 450, merchant: "Starbucks", bank: "HDFC", reference: "4231908123" }
    API->>Dedup: Generate SHA-256 Fingerprint
    Dedup->>DB: Check if fingerprint exists
    DB-->>Dedup: Unique (Not Found)
    API->>DB: Create Transaction (status: PENDING_APPROVAL)
    API->>DB: Save TransactionCreated Event
    API->>Queue: Push to ai-categorization-queue
    API->>Push: Dispatch Deep-Linked Push Notification ("New Payment Captured")
    Push->>Mobile: Display Push Notification
    API-->>Shortcut: HTTP 201 Created { transactionId: "tx_123" }

    Note over Queue, AI: Asynchronous Processing
    Queue->>AI: Process Transaction tx_123
    AI->>AI: Query Ollama Qwen2.5:14B for Category & Purpose Suggestion
    AI->>DB: Update Transaction { aiSuggestion: "Coffee & Snacks", aiConfidence: 0.94 }
```

---

## 2. Mobile Inbox Purpose Assignment Flow (Offline-First)

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant App as Mobile App UI
    participant Zustand as Client Store (Zustand)
    participant SQLite as Local SQLite Database
    participant SyncQ as pending_sync_queue (SQLite)
    participant SyncService as Background Sync Task
    participant API as Express API Server
    participant DB as MongoDB Database

    User->>App: Opens Inbox & selects transaction tx_123
    User->>App: Chooses Category "Food & Dining" & Note "Meeting with Alex"
    App->>Zustand: Optimistically update transaction state in memory
    App->>SQLite: UPDATE local_transactions SET category="Food & Dining", notes="Meeting with Alex", status="CONFIRMED"
    App->>SyncQ: INSERT INTO pending_sync_queue (entity_id: "tx_123", operation: "UPDATE")
    App-->>User: Instant UI Feedback (Transaction moved to Confirmed)

    Note over SyncService: Network Sync Execution
    SyncService->>SyncQ: Fetch items WHERE status = 'PENDING_UPLOAD'
    SyncService->>API: POST /api/v1/sync/push (Batch Queue Payload)
    API->>DB: Update Transaction & Write PurposeAssigned Event
    API->>DB: Train Merchant Memory (Starbucks -> Food & Dining)
    API-->>SyncService: HTTP 200 OK { syncedIds: ["tx_123"] }
    SyncService->>SQLite: DELETE FROM pending_sync_queue WHERE queue_id = "q_123"
```

---

## 3. Conversational AI Query Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant Web as Web / Mobile AI Chat UI
    participant API as Express API Server
    participant AIWorker as ai-worker Service
    participant MongoVector as MongoDB Vector Search
    participant Ollama as Ollama (Qwen2.5:14B)

    User->>Web: Types "How much did I spend on food after salary day this month?"
    Web->>API: POST /api/v1/ai/chat { query: "..." }
    API->>AIWorker: Dispatch Chat Task
    AIWorker->>AIWorker: Generate Query Embedding (nomic-embed-text)
    AIWorker->>MongoVector: Perform Vector Similarity Search on ai_memory & transactions
    MongoVector-->>AIWorker: Relevant Transaction Context (Salary date: 1st, Food expenses total: ₹14,200)
    AIWorker->>Ollama: Prompt Qwen2.5:14B with Context & Query
    Ollama-->>AIWorker: Streamed Response: "You spent ₹14,200 across 28 dining transactions..."
    AIWorker-->>API: Format Chat DTO
    API-->>Web: Stream Answer to UI
```
