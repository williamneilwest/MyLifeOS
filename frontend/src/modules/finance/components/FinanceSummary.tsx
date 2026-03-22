import { Card } from '../../../components/ui/Card';
import type { FinanceEntry } from '../../../types';

interface FinanceSummaryProps {
  entries: FinanceEntry[];
}

export function FinanceSummary({ entries }: FinanceSummaryProps) {
  const income = entries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = entries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
  const savings = entries.filter((entry) => entry.type === 'savings').reduce((sum, entry) => sum + entry.amount, 0);

  const cards = [
    { label: 'Income', value: income },
    { label: 'Expenses', value: expenses },
    { label: 'Savings', value: savings },
    { label: 'Net', value: income - expenses - savings },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <p className="text-sm text-slate-400">{card.label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">${card.value.toLocaleString()}</p>
        </Card>
      ))}
    </div>
  );
}
