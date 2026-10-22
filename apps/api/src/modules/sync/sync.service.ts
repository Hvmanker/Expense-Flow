import { TransactionModel } from '@expenseflow/database';
import { SyncQueueItem } from '@expenseflow/shared-types';
import { Types } from 'mongoose';

const ALLOWED_UPDATE_FIELDS = ['category', 'subcategory', 'purpose', 'notes', 'status'] as const;
const ALLOWED_CREATE_FIELDS = [
  'fingerprint', 'amount', 'currency', 'merchant', 'bank', 'paymentMethod',
  'accountMasked', 'reference', 'occurredAt', 'category', 'subcategory', 'purpose', 'notes', 'status'
] as const;

function pickAllowedFields(payload: Record<string, any>, allowedKeys: readonly string[]) {
  const result: Record<string, any> = {};
  if (!payload || typeof payload !== 'object') return result;
  for (const key of allowedKeys) {
    if (payload[key] !== undefined) {
      result[key] = payload[key];
    }
  }
  return result;
}

export class SyncService {
  async processPushChanges(userId: string, changes: SyncQueueItem[]) {
    const syncedIds: string[] = [];
    const conflicts: any[] = [];
    const userObjectId = new Types.ObjectId(userId);

    for (const item of changes) {
      try {
        if (item.entityType === 'TRANSACTION') {
          if (item.operation === 'UPDATE') {
            const safePayload = pickAllowedFields(item.payload, ALLOWED_UPDATE_FIELDS);
            await TransactionModel.findOneAndUpdate(
              { _id: item.entityId, userId: userObjectId },
              {
                $set: {
                  ...safePayload,
                  syncStatus: 'SYNCED',
                  updatedAt: new Date(),
                },
              }
            );
            syncedIds.push(item.queueId);
          } else if (item.operation === 'CREATE') {
            const safePayload = pickAllowedFields(item.payload, ALLOWED_CREATE_FIELDS);
            await TransactionModel.create({
              ...safePayload,
              userId: userObjectId,
              syncStatus: 'SYNCED',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            syncedIds.push(item.queueId);
          } else if (item.operation === 'DELETE') {
            await TransactionModel.findOneAndUpdate(
              { _id: item.entityId, userId: userObjectId },
              { $set: { status: 'ARCHIVED', syncStatus: 'SYNCED' } }
            );
            syncedIds.push(item.queueId);
          }
        }
      } catch (err: any) {
        conflicts.push({ queueId: item.queueId, error: err.message });
      }
    }

    return { syncedIds, conflicts };
  }

  async getPullDeltas(userId: string, lastSyncTimestamp: string) {
    const userObjectId = new Types.ObjectId(userId);
    const filter: any = { userId: userObjectId };

    if (lastSyncTimestamp) {
      filter.updatedAt = { $gt: new Date(lastSyncTimestamp) };
    }

    const transactions = await TransactionModel.find(filter).lean();
    return {
      transactions: transactions.map((t) => ({
        id: t._id.toString(),
        userId: t.userId.toString(),
        fingerprint: t.fingerprint,
        amount: t.amount,
        currency: t.currency,
        merchant: t.merchant,
        bank: t.bank,
        paymentMethod: t.paymentMethod,
        category: t.category,
        purpose: t.purpose,
        notes: t.notes,
        status: t.status,
        syncStatus: 'SYNCED',
        occurredAt: t.occurredAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      serverTimestamp: new Date().toISOString(),
    };
  }

  async getSyncStatus(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const count = await TransactionModel.countDocuments({ userId: userObjectId });
    return {
      serverTimestamp: new Date().toISOString(),
      totalTransactions: count,
      lastSyncStatus: 'HEALTHY',
    };
  }
}
