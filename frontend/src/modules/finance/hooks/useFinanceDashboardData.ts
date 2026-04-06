import { useEffect, useMemo } from 'react';
import { usePlaidSyncStore } from '../../../store/usePlaidSyncStore';
import { useFinance } from './useFinance';
import { mergeFinanceRows } from '../utils/financeAnalytics';

export function useFinanceDashboardData() {
  const { entries, loading, error } = useFinance();
  const plaidTransactions = usePlaidSyncStore((state) => state.transactions);
  const hydrateStatus = usePlaidSyncStore((state) => state.hydrateStatus);

  useEffect(() => {
    void hydrateStatus();
  }, [hydrateStatus]);

  const rows = useMemo(() => mergeFinanceRows(entries, plaidTransactions), [entries, plaidTransactions]);

  return {
    rows,
    loading,
    error,
  };
}
