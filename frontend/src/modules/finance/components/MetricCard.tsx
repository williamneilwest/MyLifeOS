import { Card } from '../../../components/ui/Card';
import { cn } from '../../../utils/cn';

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: number;
  className?: string;
}

export function MetricCard({ label, value, subtext, trend, className }: MetricCardProps) {
  const trendColor = trend === undefined ? 'text-zinc-400' : trend >= 0 ? 'text-emerald-300' : 'text-rose-300';
  const trendPrefix = trend === undefined ? '' : trend >= 0 ? '+' : '';

  return (
    <Card variant="compact" className={cn('h-full', className)}>
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {subtext ? <p className="mt-1 text-xs text-zinc-400">{subtext}</p> : null}
      {trend !== undefined ? <p className={cn('mt-2 text-xs font-medium', trendColor)}>{trendPrefix}{trend.toFixed(1)}% vs last month</p> : null}
    </Card>
  );
}
