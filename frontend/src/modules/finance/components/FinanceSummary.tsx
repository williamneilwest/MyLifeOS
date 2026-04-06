import { Card } from '../../../components/ui/Card';
import { Link } from 'react-router-dom';
import type { FinanceEntry } from '../../../types';

interface FinanceSummaryProps {
  entries: FinanceEntry[];
  totalDebt?: number;
}

export function FinanceSummary({ entries = [], totalDebt = 0 }: FinanceSummaryProps) {
  const income = entries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = entries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
  const savings = entries.filter((entry) => entry.type === 'savings').reduce((sum, entry) => sum + entry.amount, 0);

  const cards = [
    { key: 'income', label: 'Income', value: income, href: '/finance/income' },
    { key: 'expenses', label: 'Expenses', value: expenses, href: '/finance/expenses' },
    { key: 'savings', label: 'Savings', value: savings, href: '/finance/savings' },
    { key: 'debt', label: 'Debt', value: totalDebt, href: '/finance/debt' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Link key={card.key} to={card.href} className="block">
          <Card className="cursor-pointer">
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">${Number(card.value ?? 0).toLocaleString()}</p>
            <p className="mt-2 text-xs text-cyan-300">Click for details</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
