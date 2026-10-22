export const SCHEMA_SQL = [
  // 1. Transactions Table
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    fingerprint TEXT UNIQUE,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    merchant TEXT NOT NULL,
    bank TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    account_masked TEXT,
    reference TEXT,
    occurred_at TEXT NOT NULL,
    category TEXT,
    subcategory TEXT,
    purpose TEXT,
    notes TEXT,
    ai_category TEXT,
    ai_confidence REAL,
    ai_reasoning TEXT,
    status TEXT DEFAULT 'PENDING_APPROVAL',
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // 2. Indexes for Transactions
  `CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status, occurred_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_updated ON transactions(updated_at DESC);`,

  // 3. Offline Sync Queue Table
  `CREATE TABLE IF NOT EXISTS sync_queue (
    queue_id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    client_timestamp TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING'
  );`,

  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, client_timestamp ASC);`,

  // 4. Sync Metadata Table (stores lastSyncTimestamp, etc.)
  `CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
];
