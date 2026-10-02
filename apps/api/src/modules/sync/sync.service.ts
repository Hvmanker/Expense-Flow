import { TransactionModel } from '@expenseflow/database';
import { SyncQueueItem } from '@expenseflow/shared-types';
import { Types } from 'mongoose';

export class SyncService {
  async processPushChanges(userId: string, changes: SyncQueueItem[]) {
    const syncedIds: string[] = [];
    const conflicts: any[] = [];
    const userObjectId = new Types.ObjectId(userId);

    for (const item of changes) {
      try {
        if (item.entityType === 'TRANSACTION') {
          if (item.operation === 'UPDATE') {
            await TransactionModel.findOneAndUpdate(
              { _id: item.entityId, userId: userObjectId },
              {
                $set: {
                  ...item.payload,
                  syncStatus: 'SYNCED',
                  updatedAt: new Date(),
                },
              }
            );
            syncedIds.push(item.queueId);
          } else if (item.operation === 'CREATE') {
            await TransactionModel.create({
              ...item.payload,
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
