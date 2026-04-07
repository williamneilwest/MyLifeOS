import type { FinanceEntry } from '../../../types';
import type { PlaidTransaction } from '../../../services/plaidService';

export type FinanceRow = FinanceEntry & {
  source: 'manual' | 'plaid';
  sourceLabel: string;
  account_id?: string | null;
};

const CURRENCY_FORMATTER = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return CURRENCY_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number): string {
  return `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;
}

export function safeDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function monthKey(value: string): string {
  const parsed = safeDate(value);
  if (!parsed) {
    return 'Unknown';
  }
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(value: string): string {
  if (value === 'Unknown') {
    return value;
  }
  const [yearRaw, monthRaw] = value.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return value;
  }
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function daysBetweenInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

function plaidToFinanceRow(transaction: PlaidTransaction): FinanceRow {
  const plaidAmount = Math.abs(Number(transaction.amount || 0));
  const inferredType = transaction.type === 'income' || transaction.type === 'expense' || transaction.type === 'savings'
    ? transaction.type
    : Number(transaction.amount || 0) < 0
      ? 'income'
      : 'expense';
  const category = Array.isArray(transaction.category)
    ? transaction.category?.[0] || 'Linked Account'
    : transaction.category || 'Linked Account';
  return {
    id: transaction.id || (transaction.transaction_id ? `plaid-${transaction.transaction_id}` : `plaid-${transaction.name}-${transaction.date}`),
    name: transaction.merchant_name || transaction.name || 'Plaid Transaction',
    category,
    amount: plaidAmount,
    type: inferredType,
    date: transaction.date,
    account_id: transaction.account_id ?? null,
    source: transaction.source === 'manual' ? 'manual' : 'plaid',
    sourceLabel: transaction.source === 'manual' ? 'Manual' : 'Plaid',
  };
}

function manualToFinanceRow(entry: FinanceEntry): FinanceRow {
  return {
    ...entry,
    account_id: null,
    source: 'manual',
    sourceLabel: 'Manual',
  };
}

export function mergeFinanceRows(entries: FinanceEntry[] = [], plaidTransactions: PlaidTransaction[] = []): FinanceRow[] {
  return [...entries.map(manualToFinanceRow), ...plaidTransactions.map(plaidToFinanceRow)].sort((left, right) => {
    if (left.date === right.date) {
      return right.id.localeCompare(left.id);
    }
    return right.date.localeCompare(left.date);
  });
}

export function filterRowsByType(rows: FinanceRow[], type: FinanceEntry['type']): FinanceRow[] {
  return rows.filter((row) => row.type === type);
}

export function sumAmount(rows: FinanceRow[]): number {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

export function groupByMonth(rows: FinanceRow[]): Array<{ month: string; label: string; total: number }> {
  const monthlyMap = new Map<string, number>();
  rows.forEach((row) => {
    const key = monthKey(row.date);
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(row.amount || 0));
  });

  return Array.from(monthlyMap.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([month, total]) => ({ month, label: monthLabel(month), total }));
}

export function groupByCategory(rows: FinanceRow[]): Array<{ category: string; total: number }> {
  const categoryMap = new Map<string, number>();
  rows.forEach((row) => {
    const key = row.category?.trim() || 'Uncategorized';
    categoryMap.set(key, (categoryMap.get(key) || 0) + Number(row.amount || 0));
  });

  return Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((left, right) => right.total - left.total);
}

export function getCurrentMonthTotal(rows: FinanceRow[]): number {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const key = `${now.getUTCFullYear()}-${month}`;
  return rows.reduce((sum, row) => (monthKey(row.date) === key ? sum + Number(row.amount || 0) : sum), 0);
}

export function calculateGrowthPercent(currentValue: number, previousValue: number): number {
  if (previousValue <= 0) {
    return currentValue > 0 ? 100 : 0;
  }
  return ((currentValue - previousValue) / previousValue) * 100;
}

export function calculateAverageDailySpend(expenseRows: FinanceRow[]): number {
  if (!expenseRows.length) {
    return 0;
  }

  const dates = expenseRows
    .map((row) => safeDate(row.date))
    .filter((date): date is Date => Boolean(date));

  if (!dates.length) {
    return 0;
  }

  const sorted = [...dates].sort((left, right) => left.getTime() - right.getTime());
  const days = daysBetweenInclusive(sorted[0], sorted[sorted.length - 1]);
  return sumAmount(expenseRows) / days;
}

export function calculatePayoffMonths(balance: number, monthlyPayment: number, aprPercent: number): number | null {
  if (balance <= 0 || monthlyPayment <= 0) {
    return null;
  }

  const monthlyRate = Math.max(0, aprPercent) / 100 / 12;
  if (monthlyRate === 0) {
    return Math.ceil(balance / monthlyPayment);
  }

  if (monthlyPayment <= balance * monthlyRate) {
    return null;
  }

  const numerator = -Math.log(1 - (balance * monthlyRate) / monthlyPayment);
  const denominator = Math.log(1 + monthlyRate);
  const months = numerator / denominator;
  return Number.isFinite(months) ? Math.ceil(months) : null;
}
