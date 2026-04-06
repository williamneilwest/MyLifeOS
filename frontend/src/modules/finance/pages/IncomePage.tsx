import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, SectionHeader } from '../../../components/ui';
import { FinanceCharts } from '../components/FinanceCharts';
import { FinanceTable } from '../components/FinanceTable';
import { MetricCard } from '../components/MetricCard';
import { useFinanceDashboardData } from '../hooks/useFinanceDashboardData';
import {
  calculateGrowthPercent,
  filterRowsByType,
  formatCurrency,
  groupByCategory,
  groupByMonth,
  sumAmount,
  getCurrentMonthTotal,
} from '../utils/financeAnalytics';

export function IncomePage() {
  const { rows, loading, error } = useFinanceDashboardData();
  const incomeRows = filterRowsByType(rows, 'income');

  const monthly = groupByMonth(incomeRows);
  const totalIncome = sumAmount(incomeRows);
  const monthlyIncome = getCurrentMonthTotal(incomeRows);
  const averageMonthlyIncome = monthly.length ? totalIncome / monthly.length : 0;
  const previousMonthTotal = monthly.length > 1 ? monthly[monthly.length - 2].total : 0;
  const currentMonthTotal = monthly.length ? monthly[monthly.length - 1].total : 0;
  const growthPercent = calculateGrowthPercent(currentMonthTotal, previousMonthTotal);

  const topSources = groupByCategory(incomeRows)
    .slice(0, 6)
    .map((item) => ({ label: item.category, total: Number(item.total.toFixed(2)) }));

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Finance"
        title="Income Analytics"
        description="Track recurring sources, trend velocity, and month-over-month growth."
        actions={
          <Link to="/finance">
            <Button variant="outline" className="gap-2"><ArrowLeft size={16} />Back to Finance</Button>
          </Link>
        }
      />

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

      {!loading && !incomeRows.length ? <Card><p className="text-sm text-zinc-400">No income records yet. Add a manual income entry or sync Plaid transactions.</p></Card> : null}
      {error ? <Card><p className="text-sm text-rose-300">{error}</p></Card> : null}
    </div>
  );
}
