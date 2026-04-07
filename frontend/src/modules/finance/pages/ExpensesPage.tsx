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
  calculateAverageDailySpend,
  filterRowsByType,
  formatCurrency,
  groupByCategory,
  groupByMonth,
} from '../utils/financeAnalytics';

export function ExpensesPage() {
  const navigate = useNavigate();
  const { filteredTransactions, expenses, loading, error } = useFinanceModuleData();

  const expenseRows = useMemo(() => filterRowsByType(filteredTransactions, 'expense'), [filteredTransactions]);
  const totalExpenses = expenses;
  const monthly = useMemo(() => groupByMonth(expenseRows), [expenseRows]);
  const burnRate = monthly.length ? totalExpenses / monthly.length : 0;
  const avgDailySpend = calculateAverageDailySpend(expenseRows);

  const byCategory = useMemo(() => groupByCategory(expenseRows), [expenseRows]);
  const pieData = useMemo(
    () => byCategory.slice(0, 8).map((item) => ({ name: item.category, total: Number(item.total.toFixed(2)) })),
    [byCategory],
  );
  const topSpendingCategories = byCategory.slice(0, 5);
  const largestTransactions = useMemo(() => [...expenseRows].sort((left, right) => right.amount - left.amount).slice(0, 5), [expenseRows]);

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
        title="Expense Analytics"
        description="Understand category pressure, burn rate, and high-impact transactions."
      />
      <FinanceSubNav />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total Expenses" value={formatCurrency(totalExpenses)} subtext="All-time spend" />
        <MetricCard label="Average Daily Spend" value={formatCurrency(avgDailySpend)} subtext="Across active date range" />
        <MetricCard label="Burn Rate" value={formatCurrency(burnRate)} subtext="Average monthly spend" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card title="Expense Breakdown" description="Distribution by category.">
          <FinanceCharts type="pie" data={pieData} nameKey="name" yKey="total" />
        </Card>

        <Card title="Monthly Expense Trend" description="Trendline of spending over time.">
          <FinanceCharts type="line" data={monthly} xKey="label" yKey="total" />
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card title="Top Spending Categories" description="Categories with highest cumulative spend.">
          <div className="space-y-2">
            {topSpendingCategories.map((category) => (
              <div key={category.category} className="rounded-lg border border-white/10 bg-zinc-950/50 p-3 text-sm">
                <p className="text-zinc-300">{category.category}</p>
                <p className="mt-1 text-base font-medium text-white">{formatCurrency(category.total)}</p>
              </div>
            ))}
            {!topSpendingCategories.length ? <p className="text-sm text-zinc-400">No category data available.</p> : null}
          </div>
        </Card>

        <Card title="Largest Transactions" description="Biggest individual expense entries.">
          <div className="space-y-2">
            {largestTransactions.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-white/10 bg-zinc-950/50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-zinc-200">{entry.category}</p>
                  <p className="font-medium text-white">{formatCurrency(entry.amount)}</p>
                </div>
                <p className="mt-1 text-xs text-zinc-400">{entry.date} • {entry.sourceLabel}</p>
              </div>
            ))}
            {!largestTransactions.length ? <p className="text-sm text-zinc-400">No expense transactions found.</p> : null}
          </div>
        </Card>
      </section>

      <Card>
        <FinanceTable rows={expenseRows} title="Expense Transactions" />
      </Card>

      {!loading && !expenseRows.length ? (
        <Card>
          <p className="text-sm text-zinc-400">No expense records yet. Add expenses or sync your linked accounts.</p>
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
