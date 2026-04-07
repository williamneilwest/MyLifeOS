import { useCallback, useEffect, useMemo, useState } from 'react';
import { plaidService, type PlaidAccount } from '../services/plaidService';
import { usePlaidSyncStore } from '../store/plaidSyncStore';
import { useFinance } from './useFinance';
import { mergeFinanceRows, type FinanceRow } from '../utils/financeAnalytics';

export interface FinanceDashboardData {
  rows: FinanceRow[];
  accounts: PlaidAccount[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFinanceDashboardData(): FinanceDashboardData {
  const { entries, loading: financeLoading, error: financeError, refresh: refreshFinance } = useFinance();

  const hydrateStatus = usePlaidSyncStore((state) => state.hydrateStatus);
  const plaidTransactions = usePlaidSyncStore((state) => state.transactions);
  const isSyncing = usePlaidSyncStore((state) => state.isSyncing);
  const syncError = usePlaidSyncStore((state) => state.syncError);

  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const loadAccounts = useCallback(async (refresh = false) => {
    setAccountsLoading(true);
    try {
      const payload = await plaidService.getAccounts(refresh);
      setAccounts(payload.accounts || []);
      setAccountsError(null);
    } catch (error) {
      setAccounts([]);
      setAccountsError(error instanceof Error ? error.message : 'Failed to load accounts');
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrateStatus();
    void loadAccounts(false);
  }, [hydrateStatus, loadAccounts]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshFinance(), hydrateStatus(), loadAccounts(true)]);
  }, [hydrateStatus, loadAccounts, refreshFinance]);

  const rows = useMemo(() => mergeFinanceRows(entries, plaidTransactions), [entries, plaidTransactions]);

  return {
    rows,
    accounts,
    loading: financeLoading || isSyncing || accountsLoading,
    error: financeError || syncError || accountsError,
    refresh,
  };
}
