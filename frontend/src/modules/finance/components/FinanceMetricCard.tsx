import type { ReactNode } from 'react';
import { Card } from '../../../components/ui/Card';

interface FinanceMetricCardProps {
  title: string;
  value: string;
  helper: string;
  icon: ReactNode;
}

export function FinanceMetricCard({ title, value, helper, icon }: FinanceMetricCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{helper}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-cyan-300">{icon}</div>
      </div>
    </Card>
  );
}
