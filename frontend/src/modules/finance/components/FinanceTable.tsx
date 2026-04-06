import { useMemo, useState } from 'react';
import type { FinanceRow } from '../utils/financeAnalytics';
import { formatCurrency } from '../utils/financeAnalytics';

type SortField = 'date' | 'category' | 'amount' | 'source';

type SortDirection = 'asc' | 'desc';

interface FinanceTableProps {
  rows: FinanceRow[];
  title?: string;
  maxRows?: number;
}

function nextDirection(active: boolean, current: SortDirection): SortDirection {
  if (!active) {
    return 'desc';
  }
  return current === 'desc' ? 'asc' : 'desc';
}

export function FinanceTable({ rows, title = 'Transactions', maxRows = 50 }: FinanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const displayedRows = useMemo(() => {
    const sorted = [...rows].sort((left, right) => {
      if (sortField === 'amount') {
        return sortDirection === 'asc' ? left.amount - right.amount : right.amount - left.amount;
      }

      const leftValue = String(left[sortField] || '').toLowerCase();
      const rightValue = String(right[sortField] || '').toLowerCase();
      if (leftValue === rightValue) {
        return 0;
      }
      if (sortDirection === 'asc') {
        return leftValue > rightValue ? 1 : -1;
      }
      return leftValue < rightValue ? 1 : -1;
    });

    return sorted.slice(0, maxRows);
  }, [maxRows, rows, sortDirection, sortField]);

  function handleSort(field: SortField) {
    const isActive = sortField === field;
    setSortField(field);
    setSortDirection(nextDirection(isActive, sortDirection));
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-xs text-zinc-400">{displayedRows.length} rows</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/50">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900/70 text-zinc-400">
            <tr>
              <th className="px-3 py-2"><button className="hover:text-white" onClick={() => handleSort('date')}>Date</button></th>
              <th className="px-3 py-2"><button className="hover:text-white" onClick={() => handleSort('category')}>Category</button></th>
              <th className="px-3 py-2 text-right"><button className="hover:text-white" onClick={() => handleSort('amount')}>Amount</button></th>
              <th className="px-3 py-2"><button className="hover:text-white" onClick={() => handleSort('source')}>Source</button></th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row) => (
              <tr key={row.id} className="border-t border-white/10 text-zinc-200">
                <td className="px-3 py-2">{row.date}</td>
                <td className="px-3 py-2">{row.category || 'Uncategorized'}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(row.amount)}</td>
                <td className="px-3 py-2">{row.sourceLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!displayedRows.length ? <p className="px-3 py-4 text-sm text-zinc-400">No transactions found.</p> : null}
      </div>
    </div>
  );
}
