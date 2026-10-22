import { executeSql } from '../db/client';
import { enqueueChange } from './sync-queue-store';

export interface LocalTransaction {
  id: string;
  user_id?: string;
  fingerprint: string;
  amount: number;
  currency: string;
  merchant: string;
  bank: string;
  payment_method: string;
  account_masked?: string;
  reference?: string;
  occurred_at: string;
  category?: string;
  subcategory?: string;
  purpose?: string;
  notes?: string;
  ai_category?: string;
  ai_confidence?: number;
  ai_reasoning?: string;
  status: 'PENDING_APPROVAL' | 'CONFIRMED' | 'IGNORED' | 'FLAGGED' | 'ARCHIVED';
  sync_status: 'SYNCED' | 'PENDING';
  created_at: string;
  updated_at: string;
}

export async function getPendingTransactions(): Promise<LocalTransaction[]> {
  return executeSql<LocalTransaction>(
    `SELECT * FROM transactions
     WHERE status = 'PENDING_APPROVAL'
     ORDER BY occurred_at DESC;`
  );
}

export async function getRecentConfirmedTransactions(limit = 10): Promise<LocalTransaction[]> {
  return executeSql<LocalTransaction>(
    `SELECT * FROM transactions
     WHERE status = 'CONFIRMED'
     ORDER BY occurred_at DESC
     LIMIT ?;`,
    [limit]
  );
}

export async function getTotalConfirmedSpend(): Promise<number> {
  const rows = await executeSql<{ total: number }>(
    `SELECT SUM(amount) as total FROM transactions WHERE status = 'CONFIRMED';`
  );
  return rows[0]?.total || 0;
}

export async function confirmTransaction(
  id: string,
  category: string,
  purpose: string
): Promise<void> {
  const now = new Date().toISOString();
  await executeSql(
    `UPDATE transactions
     SET status = 'CONFIRMED', category = ?, purpose = ?, sync_status = 'PENDING', updated_at = ?
     WHERE id = ?;`,
    [category, purpose, now, id]
  );

  // Enqueue for background delta sync
  await enqueueChange('TRANSACTION', 'UPDATE', id, {
    status: 'CONFIRMED',
    category,
    purpose,
    updatedAt: now,
  });
}

export async function ignoreTransaction(id: string): Promise<void> {
  const now = new Date().toISOString();
  await executeSql(
    `UPDATE transactions
     SET status = 'IGNORED', sync_status = 'PENDING', updated_at = ?
     WHERE id = ?;`,
    [now, id]
  );

  await enqueueChange('TRANSACTION', 'UPDATE', id, {
    status: 'IGNORED',
    updatedAt: now,
  });
}

export async function insertCapturedSMSTransaction(parsed: any): Promise<string> {
  const id = `tx-local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const fingerprint = `${parsed.bank || 'BANK'}_${parsed.amount || 0}_${parsed.occurredAt || now}_${parsed.accountMasked || ''}_${parsed.merchant || ''}`;

  await executeSql(
    `INSERT OR IGNORE INTO transactions (
      id, fingerprint, amount, currency, merchant, bank, payment_method,
      account_masked, reference, occurred_at, status, sync_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', 'PENDING', ?, ?);`,
    [
      id,
      fingerprint,
      parsed.amount || 0,
      'INR',
      parsed.merchant || 'Unknown Merchant',
      parsed.bank || 'Unknown Bank',
      parsed.paymentMethod || 'OTHER',
      parsed.accountMasked || null,
      parsed.reference || null,
      parsed.occurredAt || now,
      now,
      now,
    ]
  );

  // Enqueue for background push sync
  await enqueueChange('TRANSACTION', 'CREATE', id, {
    id,
    fingerprint,
    amount: parsed.amount || 0,
    currency: 'INR',
    merchant: parsed.merchant || 'Unknown Merchant',
    bank: parsed.bank || 'Unknown Bank',
    paymentMethod: parsed.paymentMethod || 'OTHER',
    occurredAt: parsed.occurredAt || now,
    status: 'PENDING_APPROVAL',
  });

  return id;
}

export async function upsertServerTransactions(serverTxList: any[]): Promise<void> {
  for (const tx of serverTxList) {
    const id = tx.id || tx._id;
    await executeSql(
      `INSERT OR REPLACE INTO transactions (
        id, user_id, fingerprint, amount, currency, merchant, bank, payment_method,
        account_masked, reference, occurred_at, category, subcategory, purpose, notes,
        ai_category, ai_confidence, status, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?, ?);`,
      [
        id,
        tx.userId,
        tx.fingerprint,
        tx.amount,
        tx.currency || 'INR',
        tx.merchant,
        tx.bank,
        tx.paymentMethod,
        tx.accountMasked,
        tx.reference,
        tx.occurredAt || new Date().toISOString(),
        tx.category,
        tx.subcategory,
        tx.purpose,
        tx.notes,
        tx.aiSuggestion?.category || tx.category,
        tx.aiConfidence || 0.9,
        tx.status || 'PENDING_APPROVAL',
        tx.createdAt || new Date().toISOString(),
        tx.updatedAt || new Date().toISOString(),
      ]
    );
  }
}
