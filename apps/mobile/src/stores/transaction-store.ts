import { create } from 'zustand';
import {
  LocalTransaction,
  getPendingTransactions,
  getRecentConfirmedTransactions,
  getTotalConfirmedSpend,
  confirmTransaction,
  ignoreTransaction,
} from '../services/transaction-store';
import { getPendingSyncCount, getLastSyncTimestamp } from '../services/sync-queue-store';
import { syncClient } from '../services/sync-client';

interface TransactionStoreState {
  pendingTransactions: LocalTransaction[];
  recentTransactions: LocalTransaction[];
  totalSpend: number;
  pendingSyncCount: number;
  lastSyncTime: string | null;
  isLoading: boolean;
  isSyncing: boolean;

  loadData: () => Promise<void>;
  confirmItem: (id: string, category: string, purpose: string) => Promise<void>;
  ignoreItem: (id: string) => Promise<void>;
  triggerSync: () => Promise<void>;
}

export const useTransactionStore = create<TransactionStoreState>((set, get) => ({
  pendingTransactions: [],
  recentTransactions: [],
  totalSpend: 0,
  pendingSyncCount: 0,
  lastSyncTime: null,
  isLoading: true,
  isSyncing: false,

  loadData: async () => {
    try {
      const [pending, recent, total, pendingSync, lastSync] = await Promise.all([
        getPendingTransactions(),
        getRecentConfirmedTransactions(5),
        getTotalConfirmedSpend(),
        getPendingSyncCount(),
        getLastSyncTimestamp(),
      ]);

      set({
        pendingTransactions: pending,
        recentTransactions: recent,
        totalSpend: total,
        pendingSyncCount: pendingSync,
        lastSyncTime: lastSync || null,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to load local SQLite data:', err);
      set({ isLoading: false });
    }
  },

  confirmItem: async (id: string, category: string, purpose: string) => {
    // Optimistic UI Update
    set((state) => ({
      pendingTransactions: state.pendingTransactions.filter((tx) => tx.id !== id),
      pendingSyncCount: state.pendingSyncCount + 1,
    }));

    await confirmTransaction(id, category, purpose);
    await get().loadData();
  },

  ignoreItem: async (id: string) => {
    // Optimistic UI Update
    set((state) => ({
      pendingTransactions: state.pendingTransactions.filter((tx) => tx.id !== id),
      pendingSyncCount: state.pendingSyncCount + 1,
    }));

    await ignoreTransaction(id);
    await get().loadData();
  },

  triggerSync: async () => {
    set({ isSyncing: true });
    try {
      await syncClient.runSync();
      await get().loadData();
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
