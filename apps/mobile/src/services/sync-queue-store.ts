import { executeSql } from '../db/client';
import { SyncQueueItem } from '@expenseflow/shared-types';

export interface LocalSyncQueueRow {
  queue_id: string;
  entity_id: string;
  entity_type: 'TRANSACTION' | 'CATEGORY' | 'MERCHANT';
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string;
  client_timestamp: string;
  retry_count: number;
  status: string;
}

export async function enqueueChange(
  entityType: 'TRANSACTION' | 'CATEGORY' | 'MERCHANT',
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  entityId: string,
  payload: Record<string, any>
): Promise<string> {
  const queueId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const clientTimestamp = new Date().toISOString();

  await executeSql(
    `INSERT INTO sync_queue (queue_id, entity_id, entity_type, operation, payload, client_timestamp, status)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING');`,
    [queueId, entityId, entityType, operation, JSON.stringify(payload), clientTimestamp]
  );

  return queueId;
}

export async function getPendingQueue(): Promise<SyncQueueItem[]> {
  const rows = await executeSql<LocalSyncQueueRow>(
    `SELECT queue_id, entity_id, entity_type, operation, payload, client_timestamp
     FROM sync_queue
     WHERE status = 'PENDING'
     ORDER BY client_timestamp ASC;`
  );

  return rows.map((row) => ({
    queueId: row.queue_id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    operation: row.operation,
    payload: JSON.parse(row.payload),
    clientTimestamp: row.client_timestamp,
  }));
}

export async function markQueueItemsSynced(queueIds: string[]): Promise<void> {
  if (queueIds.length === 0) return;
  const placeholders = queueIds.map(() => '?').join(',');
  await executeSql(
    `DELETE FROM sync_queue WHERE queue_id IN (${placeholders});`,
    queueIds
  );
}

export async function getPendingSyncCount(): Promise<number> {
  const res = await executeSql<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING';`
  );
  return res[0]?.count || 0;
}

export async function getLastSyncTimestamp(): Promise<string | undefined> {
  const res = await executeSql<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'last_sync_timestamp';`
  );
  return res[0]?.value;
}

export async function setLastSyncTimestamp(timestamp: string): Promise<void> {
  await executeSql(
    `INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync_timestamp', ?);`,
    [timestamp]
  );
}
