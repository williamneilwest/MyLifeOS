import { useMemo } from 'react';
import type { PlaidAccount } from '../services/plaidService';
import type { FinanceFilters, FinanceTxType, TimeRange } from '../store/financeFiltersStore';
import type { FinanceRow } from '../utils/financeAnalytics';
import { accountCurrentBalance, isSelectedAccount } from '../utils/accountMetrics';

interface UseFinanceDataInput {
  accounts: PlaidAccount[];
  transactions: FinanceRow[];
  filters: FinanceFilters;
}

interface UseFinanceDataResult {
  selectedAccountIds: string[];
  effectiveAccountIds: string[];
  filteredAccounts: PlaidAccount[];
  accountScopedTransactions: FinanceRow[];
  filteredTransactions: FinanceRow[];
  income: number;
  expenses: number;
  savings: number;
  debt: number;
  netBalance: number;
}

function isDateInRange(dateRaw: string, timeRange: TimeRange): boolean {
  if (timeRange === 'all') {
    return true;
  }

  const date = new Date(`${dateRaw}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const start = new Date(now);

  if (timeRange === 'week') {
    start.setDate(now.getDate() - 6);
  }

  if (timeRange === 'month') {
    start.setDate(1);
  }

  if (timeRange === 'quarter') {
    start.setDate(now.getDate() - 89);
  }

  if (timeRange === 'year') {
    start.setMonth(0, 1);
  }

  start.setHours(0, 0, 0, 0);
  return date >= start && date <= now;
}

function isSavingsAccount(account: PlaidAccount): boolean {
  return (account.subtype || '').toLowerCase() === 'savings';
}

function isDebtAccount(account: PlaidAccount): boolean {
  const type = (account.type || '').toLowerCase();
  const subtype = (account.subtype || '').toLowerCase();
  return type === 'credit' || subtype === 'loan';
}

function includesType(types: FinanceTxType[], type: FinanceRow['type']): boolean {
  return types.includes(type);
}

export function useFinanceData({ accounts, transactions, filters }: UseFinanceDataInput): UseFinanceDataResult {
  const selectedAccountIds = useMemo(
    () => accounts.filter((account) => isSelectedAccount(account)).map((account) => account.id),
    [accounts],
  );

  const effectiveAccountIds = useMemo(() => {
    if (!selectedAccountIds.length) {
      return [];
    }

    if (!filters.accountIds.length) {
      return selectedAccountIds;
    }

    const intersection = filters.accountIds.filter((id) => selectedAccountIds.includes(id));
    return intersection.length ? intersection : selectedAccountIds;
  }, [filters.accountIds, selectedAccountIds]);

  const filteredAccounts = useMemo(
    () =>
      accounts
        .filter((account) => isSelectedAccount(account))
        .filter((account) => !effectiveAccountIds.length || effectiveAccountIds.includes(account.id)),
    [accounts, effectiveAccountIds],
  );

  const accountScopedTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (!effectiveAccountIds.length) {
          return true;
        }

        if (!transaction.account_id) {
          return true;
        }

        return effectiveAccountIds.includes(transaction.account_id);
      }),
    [effectiveAccountIds, transactions],
  );

  const filteredTransactions = useMemo(
    () =>
      accountScopedTransactions
        .filter((transaction) => {
          if (!filters.categories.length) {
            return true;
          }

          const category = (transaction.category || 'Uncategorized').trim() || 'Uncategorized';
          return filters.categories.includes(category);
        })
        .filter((transaction) => {
          if (!filters.types.length) {
            return true;
          }
          return includesType(filters.types, transaction.type);
        })
        .filter((transaction) => isDateInRange(transaction.date, filters.timeRange)),
    [accountScopedTransactions, filters.categories, filters.timeRange, filters.types],
  );

  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const expenses = filteredTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const savingsFromEntries = filteredTransactions
      .filter((transaction) => transaction.type === 'savings')
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const savingsFromAccounts = filteredAccounts
      .filter((account) => isSavingsAccount(account))
      .reduce((sum, account) => sum + Number(accountCurrentBalance(account) || 0), 0);

    const debt = filteredAccounts
      .filter((account) => isDebtAccount(account))
      .reduce((sum, account) => sum + Math.abs(Number(accountCurrentBalance(account) || 0)), 0);

    const savings = savingsFromEntries + savingsFromAccounts;
    const netBalance = income + savings - expenses - debt;

    return {
      income,
      expenses,
      savings,
      debt,
      netBalance,
    };
  }, [filteredAccounts, filteredTransactions]);

  return {
    selectedAccountIds,
    effectiveAccountIds,
    filteredAccounts,
    accountScopedTransactions,
    filteredTransactions,
    ...totals,
  };
}
