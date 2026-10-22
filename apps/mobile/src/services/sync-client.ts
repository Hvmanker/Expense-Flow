import { ExpenseFlowSDK } from '@expenseflow/sdk';
import {
  getPendingQueue,
  markQueueItemsSynced,
  getLastSyncTimestamp,
  setLastSyncTimestamp,
} from './sync-queue-store';
import { upsertServerTransactions } from './transaction-store';

export interface SyncResult {
  pushedCount: number;
  pulledCount: number;
  lastSyncTimestamp: string;
  errors: string[];
}

export class MobileSyncClient {
  private sdk: ExpenseFlowSDK;
  private activeSync: Promise<SyncResult> | null = null;

  constructor(baseUrl?: string, authToken?: string) {
    this.sdk = new ExpenseFlowSDK({
      baseUrl: baseUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000',
      authToken,
    });
  }

  setAuthToken(token: string) {
    this.sdk.setAuthToken(token);
  }

  async sendMagicLink(email: string) {
    return this.sdk.sendMagicLink(email);
  }

  async verifyMagicLink(email: string, code: string) {
    return this.sdk.verifyMagicLink(email, code);
  }

  async runSync(): Promise<SyncResult> {
    if (this.activeSync) return this.activeSync;
    this.activeSync = this.performSync().finally(() => {
      this.activeSync = null;
    });
    return this.activeSync;
  }

  private async performSync(): Promise<SyncResult> {
    let pushedCount = 0;
    let pulledCount = 0;
    const errors: string[] = [];

    // 1. Drain Pending Offline Changes (Push)
    const pendingChanges = await getPendingQueue();
    if (pendingChanges.length > 0) {
      try {
        const pushRes = await this.sdk.pushSync(pendingChanges);
        if (pushRes.syncedIds && pushRes.syncedIds.length > 0) {
          await markQueueItemsSynced(pushRes.syncedIds);
          pushedCount = pushRes.syncedIds.length;
        }
      } catch (pushErr: any) {
        console.warn('Sync Push warning (will retry on next sync loop):', pushErr.message);
        errors.push(`push: ${pushErr.message}`);
      }
    }

    // 2. Fetch Server Deltas (Pull)
    const lastTimestamp = await getLastSyncTimestamp();
    try {
      const pullRes = await this.sdk.pullSync(lastTimestamp);
      if (pullRes.transactions && pullRes.transactions.length > 0) {
        await upsertServerTransactions(pullRes.transactions);
        pulledCount = pullRes.transactions.length;
      }
      if (pullRes.timestamp) {
        await setLastSyncTimestamp(pullRes.timestamp);
      }
    } catch (pullErr: any) {
      console.warn('Sync Pull warning:', pullErr.message);
      errors.push(`pull: ${pullErr.message}`);
    }

    const finalTimestamp = (await getLastSyncTimestamp()) || new Date().toISOString();

    return {
      pushedCount,
      pulledCount,
      lastSyncTimestamp: finalTimestamp,
      errors,
    };
  }
}

export const syncClient = new MobileSyncClient();
