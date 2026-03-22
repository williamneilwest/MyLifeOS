import { create } from 'zustand';
import { sampleFinanceEntries } from '../../../data/sampleData';
import { createLocalStorageRepository } from '../../../services/storage/localStorageRepository';
import type { FinanceEntry } from '../../../types';

const repository = createLocalStorageRepository<FinanceEntry[]>('life-os-finance', sampleFinanceEntries);

interface FinanceState {
  entries: FinanceEntry[];
  addEntry: (entry: FinanceEntry) => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  entries: repository.get(),
  addEntry: (entry) =>
    set((state) => {
      const entries = [entry, ...state.entries];
      repository.save(entries);
      return { entries };
    }),
}));
