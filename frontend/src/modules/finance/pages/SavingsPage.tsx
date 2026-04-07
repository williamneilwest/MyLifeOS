import { Flag } from 'lucide-react';
import { Card, SectionHeader } from '../../../components/ui';
import { FinanceCharts } from '../components/FinanceCharts';
import { FinanceSubNav } from '../components/FinanceSubNav';
import { FinanceTable } from '../components/FinanceTable';
import { MetricCard } from '../components/MetricCard';
import { useFinanceDashboardData } from '../hooks/useFinanceDashboardData';
import {
  filterRowsByType,
  formatCurrency,
  formatPercent,
  groupByMonth,
  sumAmount,
} from '../utils/financeAnalytics';

export function SavingsPage() {
  const { rows, loading, error } = useFinanceDashboardData();

  const savingsRows = filterRowsByType(rows, 'savings');
  const incomeRows = filterRowsByType(rows, 'income');
  const expenseRows = filterRowsByType(rows, 'expense');

  const totalSavings = sumAmount(savingsRows);
  const totalIncome = sumAmount(incomeRows);
  const totalExpenses = sumAmount(expenseRows);
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  const savingsMonthly = groupByMonth(savingsRows);
  const expenseMonthly = groupByMonth(expenseRows);
  const incomeMonthly = groupByMonth(incomeRows);

  const monthKeys = Array.from(new Set([...savingsMonthly, ...expenseMonthly, ...incomeMonthly].map((item) => item.month))).sort();

  const comparisonData = monthKeys.map((month) => {
    const savings = savingsMonthly.find((item) => item.month === month)?.total || 0;
    const expenses = expenseMonthly.find((item) => item.month === month)?.total || 0;
    return {
      label: savingsMonthly.find((item) => item.month === month)?.label || expenseMonthly.find((item) => item.month === month)?.label || month,
      savings: Number(savings.toFixed(2)),
      expenses: Number(expenses.toFixed(2)),
    };
  });

  let running = 0;
  const netSavingsSeries = monthKeys.map((month) => {
    const savings = savingsMonthly.find((item) => item.month === month)?.total || 0;
    const income = incomeMonthly.find((item) => item.month === month)?.total || 0;
    const expenses = expenseMonthly.find((item) => item.month === month)?.total || 0;
    running += income - expenses + savings;
    return {
      label:
        savingsMonthly.find((item) => item.month === month)?.label ||
        incomeMonthly.find((item) => item.month === month)?.label ||
        expenseMonthly.find((item) => item.month === month)?.label ||
        month,
      net: Number(running.toFixed(2)),
    };
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Finance"
        title="Savings Analytics"
        description="Measure savings consistency, retention rate, and net progress."
      />
      <FinanceSubNav />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total Savings" value={formatCurrency(totalSavings)} subtext="All-time saved amount" />
        <MetricCard label="Savings Rate" value={formatPercent(savingsRate)} subtext="Savings as a share of income" />
        <MetricCard label="Net Position" value={formatCurrency(totalIncome - totalExpenses + totalSavings)} subtext="Income - expenses + savings" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card title="Monthly Savings Trend" description="How savings contributions change over time.">
          <FinanceCharts type="line" data={savingsMonthly} xKey="label" yKey="total" />
        </Card>

        <Card title="Savings vs Expenses" description="Monthly comparison of retained vs consumed cash.">
          <FinanceCharts type="bar" data={comparisonData} xKey="label" dataKeys={['savings', 'expenses']} />
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card title="Goal Tracking" description="Starter placeholder for savings goals.">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-emerald-300"><Flag size={16} />Goal Tracking Placeholder</div>
            <p className="mt-2 text-sm text-zinc-300">Set a target and due date to monitor progress toward a specific savings objective.</p>
          </div>
        </Card>

        <Card title="Net Savings Over Time" description="Running net contribution across all months.">
          <FinanceCharts type="line" data={netSavingsSeries} xKey="label" yKey="net" />
        </Card>
      </section>

      <Card>
        <FinanceTable rows={savingsRows} title="Savings Transactions" />
      </Card>

      {!loading && !savingsRows.length ? <Card><p className="text-sm text-zinc-400">No savings entries yet. Log transfers or savings contributions to begin tracking.</p></Card> : null}
      {error ? <Card><p className="text-sm text-rose-300">{error}</p></Card> : null}
    </div>
  );
}
