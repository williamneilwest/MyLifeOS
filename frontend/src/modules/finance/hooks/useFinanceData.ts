import { useEffect, useMemo, useState } from 'react';
import { fetchFinanceSummary } from '../../../services/lifeOsService';
import type { FinanceInsight } from '../types';

export function useFinanceData() {
  const [summary, setSummary] = useState<FinanceInsight | null>(null);

  useEffect(() => {
    void fetchFinanceSummary().then((data) => {
      setSummary({
        ...data,
        monthlyDelta: data.monthlyIncome - data.monthlyExpenses,
      });
    });
  }, []);

  return useMemo(() => summary, [summary]);
}
