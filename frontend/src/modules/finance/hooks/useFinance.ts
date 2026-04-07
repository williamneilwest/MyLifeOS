import { useCallback, useEffect, useMemo, useState } from 'react';
import { financeService } from '../services/financeService';
import type { FinanceEntry } from '../../../types';

interface UseFinanceResult {
  entries: FinanceEntry[];
  loading: boolean;
  error: string | null;
  lastUpdated: string;
  refresh: () => Promise<void>;
  getById: typeof financeService.getById;
  createEntry: (entry: FinanceEntry) => Promise<FinanceEntry>;
  updateEntry: (id: string, updates: Partial<FinanceEntry>) => Promise<FinanceEntry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
  addEntry: (entry: FinanceEntry) => Promise<FinanceEntry>;
  income: number;
  expense: number;
  savings: number;
  net: number;
  fixedTarget: number;
  saveTarget: number;
}

export function useFinance(): UseFinanceResult {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result = await financeService.getAll();
      setEntries(result.data);
      setLastUpdated(result.lastUpdated);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createEntry = useCallback(async (entry: FinanceEntry) => {
    const created = await financeService.create(entry);
    setEntries((prev) => [created, ...prev]);
    setLastUpdated(await financeService.getLastUpdated());
    return created;
  }, []);

  const updateEntry = useCallback(async (id: string, updates: Partial<FinanceEntry>) => {
    const updated = await financeService.update(id, updates);
    if (!updated) {
      return null;
    }

    setEntries((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
    setLastUpdated(await financeService.getLastUpdated());
    return updated;
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const deleted = await financeService.delete(id);
    if (deleted) {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      setLastUpdated(await financeService.getLastUpdated());
    }

    return deleted;
  }, []);

  const insights = useMemo(() => {
    const income = entries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
    const expense = entries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
    const savings = entries.filter((entry) => entry.type === 'savings').reduce((sum, entry) => sum + entry.amount, 0);

    const fixedTarget = income > 0 ? Math.round((expense / income) * 100) : 0;
    const saveTarget = income > 0 ? Math.round((savings / income) * 100) : 0;
    const net = income - expense - savings;

    return {
      income,
      expense,
      savings,
      net,
      fixedTarget,
      saveTarget,
    };
  }, [entries]);

  return {
    entries,
    loading,
    error,
    lastUpdated,
    refresh: load,
    getById: financeService.getById,
    createEntry,
    updateEntry,
    deleteEntry,
    addEntry: createEntry,
    ...insights,
  };
}
