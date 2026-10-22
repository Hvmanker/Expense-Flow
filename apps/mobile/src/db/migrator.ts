import { executeSql } from './client';
import { SCHEMA_SQL } from './schema';

export async function initializeDatabase(): Promise<void> {
  // 1. Run Schema Creation Statements
  for (const statement of SCHEMA_SQL) {
    await executeSql(statement);
  }

  // 2. Check if baseline seeding is needed
  const existing = await executeSql<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions;`
  );

  if (existing.length === 0 || existing[0].count === 0) {
    const now = new Date().toISOString();
    // Seed initial pending transaction for instant user verification
    await executeSql(
      `INSERT OR IGNORE INTO transactions (
        id, user_id, fingerprint, amount, currency, merchant, bank, payment_method,
        reference, occurred_at, category, purpose, ai_category, ai_confidence, status, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        'local-seed-tx-1',
        'local-user',
        'fp-seed-starbucks',
        450.0,
        'INR',
        'Starbucks Coffee',
        'HDFC',
        'UPI',
        'UPI4290192',
        now,
        'Food & Dining',
        'Morning Coffee',
        'Food & Dining',
        0.95,
        'PENDING_APPROVAL',
        'SYNCED',
        now,
        now,
      ]
    );

    await executeSql(
      `INSERT OR IGNORE INTO transactions (
        id, user_id, fingerprint, amount, currency, merchant, bank, payment_method,
        reference, occurred_at, category, purpose, ai_category, ai_confidence, status, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        'local-seed-tx-2',
        'local-user',
        'fp-seed-swiggy',
        1250.0,
        'INR',
        'Swiggy Bangalore',
        'ICICI',
        'DEBIT_CARD',
        'REF98231',
        now,
        'Food & Dining',
        'Dinner order',
        'Food & Dining',
        0.98,
        'PENDING_APPROVAL',
        'SYNCED',
        now,
        now,
      ]
    );
  }
}
