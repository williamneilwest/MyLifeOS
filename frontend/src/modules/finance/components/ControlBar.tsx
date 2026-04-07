import { SlidersHorizontal } from 'lucide-react';
import { Badge, Button, Card } from '../../../components/ui';

export type TimeRangeValue = 'week' | 'month' | 'quarter' | 'year' | 'all';

interface SummaryMetric {
  label: string;
  value: number;
}

interface ControlBarProps {
  netBalance: number;
  summary: SummaryMetric[];
  accountsSummary: string;
  categoriesSummary: string;
  timeRange: TimeRangeValue;
  onTimeRangeChange: (value: TimeRangeValue) => void;
  onOpenFilters: () => void;
  onOpenSettings: () => void;
}

function toCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function ControlBar({
  netBalance,
  summary,
  accountsSummary,
  categoriesSummary,
  timeRange,
  onTimeRangeChange,
  onOpenFilters,
  onOpenSettings,
}: ControlBarProps) {
  return (
    <div className="sticky top-14 z-30 -mx-1 bg-zinc-950/85 px-1 pb-2 pt-1 backdrop-blur-md sm:pb-3">
      <Card className="border-emerald-400/20 bg-zinc-900/95">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Net Balance</p>
            <p className="mt-1 text-lg font-semibold text-white sm:text-2xl">{toCurrency(netBalance)}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(event) => onTimeRangeChange(event.target.value as TimeRangeValue)}
              className="h-8 rounded-lg border border-white/10 bg-zinc-950/70 px-2.5 text-xs text-white sm:h-9 sm:px-3 sm:text-sm"
              aria-label="Time range"
            >
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="quarter">Last 90 days</option>
              <option value="year">This year</option>
              <option value="all">All time</option>
            </select>
            <Button variant="outline" className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm" onClick={onOpenSettings}>
              Settings
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
          {summary.map((item) => (
            <Badge key={item.label} variant="neutral" className="px-2 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-sm">
              {item.label}: {toCurrency(item.value)}
            </Badge>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-8 gap-1.5 px-3 text-xs sm:text-sm" onClick={onOpenFilters}>
            <SlidersHorizontal size={14} />
            Filters
          </Button>
          <Badge variant="neutral" className="px-2 py-1 text-[11px] sm:text-xs">{accountsSummary}</Badge>
          <Badge variant="neutral" className="px-2 py-1 text-[11px] sm:text-xs">{categoriesSummary}</Badge>
        </div>
      </Card>
    </div>
  );
}
