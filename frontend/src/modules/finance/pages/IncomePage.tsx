import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, SectionHeader } from '../../../components/ui';
import { FinanceCharts } from '../components/FinanceCharts';
import { FinanceSubNav } from '../components/FinanceSubNav';
import { FinanceTable } from '../components/FinanceTable';
import { MetricCard } from '../components/MetricCard';
import { useFinanceModuleData } from '../hooks/useFinanceModuleData';
import {
  calculateGrowthPercent,
  filterRowsByType,
  formatCurrency,
  groupByCategory,
  groupByMonth,
  getCurrentMonthTotal,
} from '../utils/financeAnalytics';

export function IncomePage() {
  const navigate = useNavigate();
  const { filteredTransactions, income, loading, error } = useFinanceModuleData();

  const incomeRows = useMemo(() => filterRowsByType(filteredTransactions, 'income'), [filteredTransactions]);
  const monthly = useMemo(() => groupByMonth(incomeRows), [incomeRows]);
  const totalIncome = income;
  const monthlyIncome = getCurrentMonthTotal(incomeRows);
  const averageMonthlyIncome = monthly.length ? totalIncome / monthly.length : 0;
  const previousMonthTotal = monthly.length > 1 ? monthly[monthly.length - 2].total : 0;
  const currentMonthTotal = monthly.length ? monthly[monthly.length - 1].total : 0;
  const growthPercent = calculateGrowthPercent(currentMonthTotal, previousMonthTotal);

  const topSources = useMemo(
    () => groupByCategory(incomeRows).slice(0, 6).map((item) => ({ label: item.category, total: Number(item.total.toFixed(2)) })),
    [incomeRows],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-start">
        <Button
          variant="ghost"
          className="h-8 gap-1 px-2 text-xs text-zinc-300"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
              return;
            }
            navigate('/finance');
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      </div>
      <SectionHeader
        eyebrow="Finance"
        title="Income Analytics"
        description="Track recurring sources, trend velocity, and month-over-month growth."
      />
      <FinanceSubNav />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total Income" value={formatCurrency(totalIncome)} subtext="All-time recognized income" />
        <MetricCard label="Monthly Income" value={formatCurrency(monthlyIncome)} subtext="Current calendar month" trend={growthPercent} />
        <MetricCard label="Avg Monthly Income" value={formatCurrency(averageMonthlyIncome)} subtext={`${monthly.length || 0} active months`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card title="Income Over Time" description="Monthly trend from manual and Plaid-synced income.">
          <FinanceCharts type="line" data={monthly} xKey="label" yKey="total" />
        </Card>

        <Card title="Top Income Sources" description="Largest categories by cumulative amount.">
          <FinanceCharts type="bar" data={topSources} xKey="label" yKey="total" />
        </Card>
      </section>

      <Card>
        <FinanceTable rows={incomeRows} title="Income Transactions" />
      </Card>

      {!loading && !incomeRows.length ? (
        <Card>
          <p className="text-sm text-zinc-400">No income records yet. Add a manual income entry or sync Plaid transactions.</p>
        </Card>
      ) : null}
      {error ? (
        <Card>
          <p className="text-sm text-rose-300">{error}</p>
        </Card>
      ) : null}
    </div>
  );
}
