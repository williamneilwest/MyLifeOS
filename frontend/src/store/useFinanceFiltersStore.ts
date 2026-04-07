import { create } from 'zustand';
import type { FinanceEntryType } from '../types';

export type FinanceTxType = FinanceEntryType;
export type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface FinanceFilters {
  accountIds: string[];
  categories: string[];
  types: FinanceTxType[];
  timeRange: TimeRange;
}

export interface FinanceFiltersState {
  filters: FinanceFilters;
  accountIds: string[];
  categories: string[];
  types: FinanceTxType[];
  timeRange: TimeRange;
  setFilters: (filters: Partial<FinanceFilters>) => void;
  resetFilters: () => void;
}

const defaultFilters: FinanceFilters = {
  accountIds: [],
  categories: [],
  types: [],
  timeRange: 'month',
};

function toState(filters: FinanceFilters): Pick<FinanceFiltersState, 'filters' | 'accountIds' | 'categories' | 'types' | 'timeRange'> {
  return {
    filters,
    accountIds: filters.accountIds,
    categories: filters.categories,
    types: filters.types,
    timeRange: filters.timeRange,
  };
}

export const useFinanceFiltersStore = create<FinanceFiltersState>((set) => ({
  ...toState(defaultFilters),

  setFilters: (updates) =>
    set((state) => {
      const nextFilters: FinanceFilters = {
        ...state.filters,
        ...updates,
      };

      return toState(nextFilters);
    }),

  resetFilters: () => set(toState(defaultFilters)),
}));
