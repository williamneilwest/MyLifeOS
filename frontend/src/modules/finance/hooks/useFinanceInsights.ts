import { useMemo } from 'react';
import { useFinanceStore } from '../state/useFinanceStore';

export function useFinanceInsights() {
  const entries = useFinanceStore((state) => state.entries);

  return useMemo(() => {
    const income = entries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
    const expense = entries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
    const savings = entries.filter((entry) => entry.type === 'savings').reduce((sum, entry) => sum + entry.amount, 0);

    const fixedTarget = income > 0 ? Math.round((expense / income) * 100) : 0;
    const saveTarget = income > 0 ? Math.round((savings / income) * 100) : 0;
    const net = income - expense - savings;

    return {
      entries,
      income,
      expense,
      savings,
      net,
      fixedTarget,
      saveTarget,
    };
  }, [entries]);
}
