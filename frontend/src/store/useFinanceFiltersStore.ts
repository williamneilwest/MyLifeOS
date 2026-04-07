import { create } from 'zustand';
import type { TimeRangeValue } from '../modules/finance/components/ControlBar';

export type FinanceTxType = 'income' | 'expense' | 'savings';

interface FinanceFiltersState {
  accountIds: string[];
  categories: string[];
  types: FinanceTxType[];
  timeRange: TimeRangeValue;
  setFilters: (next: Partial<Pick<FinanceFiltersState, 'accountIds' | 'categories' | 'types' | 'timeRange'>>) => void;
  initializeAccounts: (ids: string[]) => void;
  reset: (defaultAccountIds: string[]) => void;
}

export const useFinanceFiltersStore = create<FinanceFiltersState>((set, get) => ({
  accountIds: [],
  categories: [],
  types: [],
  timeRange: 'month',
  setFilters: (next) => set((state) => ({ ...state, ...next })),
  initializeAccounts: (ids) => {
    const current = get().accountIds;
    if (current.length > 0) {
      return;
    }
    set({ accountIds: ids });
  },
  reset: (defaultAccountIds) =>
    set({
      accountIds: defaultAccountIds,
      categories: [],
      types: [],
      timeRange: 'month',
    }),
}));
