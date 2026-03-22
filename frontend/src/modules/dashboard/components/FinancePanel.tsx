import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { SectionHeader } from '../../../components/ui/SectionHeader';

interface FinanceMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down';
}

interface FinancePanelProps {
  metrics: FinanceMetric[];
  onOpenFinance: () => void;
}

const miniTrend = [35, 54, 49, 62, 58, 73, 80];

export function FinancePanel({ metrics, onOpenFinance }: FinancePanelProps) {
  return (
    <section>
      <SectionHeader
        title="Finance"
        description="Weekly trend and allocation movement."
        className="mb-3"
        actions={
          <Button variant="outline" className="w-full sm:w-auto" onClick={onOpenFinance}>
            Open Finance
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Weekly Cashflow Trend</p>
              <p className="mt-1 text-lg font-semibold text-white">Positive Momentum</p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
              <TrendingUp className="h-3.5 w-3.5" />
              +8.2% vs last week
            </div>
          </div>

          <div className="mt-4 grid h-28 grid-cols-7 items-end gap-2">
            {miniTrend.map((value, index) => (
              <div key={`${value}-${index}`} className="rounded-t-md bg-gradient-to-t from-emerald-500/80 to-cyan-400/80" style={{ height: `${value}%` }} />
            ))}
          </div>
        </Card>

        <div className="space-y-4 md:space-y-6">
          {metrics.map((metric) => (
            <Card key={metric.id} variant="compact">
              <p className="text-xs uppercase tracking-wide text-zinc-400">{metric.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">{metric.value}</p>
              <div
                className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                  metric.trend === 'up'
                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                }`}
              >
                {metric.trend === 'up' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {metric.delta}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
