import { create } from 'zustand';
import { plaidService, type PlaidTransaction } from '../services/plaidService';

interface SyncWarning {
  message: string;
  attemptsInWindow?: number;
  canForce?: boolean;
}

interface PlaidSyncState {
  lastSyncedAt: string | null;
  isSyncing: boolean;
  usingCachedData: boolean;
  transactions: PlaidTransaction[];
  syncError: string | null;
  syncWarning: SyncWarning | null;
  hydrateStatus: () => Promise<void>;
  syncTransactions: (force?: boolean) => Promise<void>;
  setTransactions: (transactions: PlaidTransaction[]) => void;
}

let lastSyncClickAt = 0;

export const usePlaidSyncStore = create<PlaidSyncState>((set, get) => ({
  lastSyncedAt: null,
  isSyncing: false,
  usingCachedData: true,
  transactions: [],
  syncError: null,
  syncWarning: null,

  setTransactions: (transactions) => set({ transactions }),

  hydrateStatus: async () => {
    try {
      const status = await plaidService.getSyncStatus();
      const now = Date.now();
      const last = status.last_synced_at ? new Date(status.last_synced_at).getTime() : 0;

      set({
        lastSyncedAt: status.last_synced_at,
        transactions: status.transactions || [],
        syncError: null,
      });

      if (status.should_sync && now - last > 12 * 60 * 60 * 1000) {
        await get().syncTransactions(false);
      }
    } catch (error) {
      set({
        syncError: error instanceof Error ? error.message : 'Failed to load sync status',
      });
    }
  },

  syncTransactions: async (force = false) => {
    const { isSyncing } = get();
    const now = Date.now();

    // Debounce rapid taps/clicks.
    if (isSyncing || now - lastSyncClickAt < 500) {
      return;
    }
    lastSyncClickAt = now;

    set({ isSyncing: true, syncError: null });
    try {
      const result = await plaidService.syncTransactions(force);
      set({
        transactions: result.transactions || [],
        lastSyncedAt: result.last_synced_at,
        usingCachedData: Boolean(result.cached),
        syncWarning: result.warning
          ? {
              message: result.warning.message,
              attemptsInWindow: result.warning.attempts_in_window,
              canForce: result.warning.can_force,
            }
          : null,
      });
    } catch (error) {
      set({
        syncError: error instanceof Error ? error.message : 'Failed to sync transactions',
      });
    } finally {
      set({ isSyncing: false });
    }
  },
}));
