import { useEffect, useMemo } from 'react';
import { usePlaidSyncStore } from '../../../store/usePlaidSyncStore';
import { mergeFinanceRows } from '../utils/financeAnalytics';

export function useFinanceDashboardData() {
  const plaidTransactions = usePlaidSyncStore((state) => state.transactions);
  const hydrateStatus = usePlaidSyncStore((state) => state.hydrateStatus);
  const isSyncing = usePlaidSyncStore((state) => state.isSyncing);
  const syncError = usePlaidSyncStore((state) => state.syncError);

  useEffect(() => {
    void hydrateStatus();
  }, [hydrateStatus]);

  const rows = useMemo(() => mergeFinanceRows([], plaidTransactions), [plaidTransactions]);

  return {
    rows,
    loading: isSyncing,
    error: syncError,
  };
}
