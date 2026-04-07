import { useMemo } from 'react';
import { ArrowLeft, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, SectionHeader } from '../../../components/ui';
import { FinanceCharts } from '../components/FinanceCharts';
import { FinanceSubNav } from '../components/FinanceSubNav';
import { FinanceTable } from '../components/FinanceTable';
import { MetricCard } from '../components/MetricCard';
import { useFinanceModuleData } from '../hooks/useFinanceModuleData';
import {
  filterRowsByType,
  formatCurrency,
  formatPercent,
  groupByMonth,
} from '../utils/financeAnalytics';

export function SavingsPage() {
  const navigate = useNavigate();
  const { filteredTransactions, income, expenses, savings, loading, error } = useFinanceModuleData();

  const savingsRows = useMemo(() => filterRowsByType(filteredTransactions, 'savings'), [filteredTransactions]);
  const incomeRows = useMemo(() => filterRowsByType(filteredTransactions, 'income'), [filteredTransactions]);
  const expenseRows = useMemo(() => filterRowsByType(filteredTransactions, 'expense'), [filteredTransactions]);
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  const savingsMonthly = useMemo(() => groupByMonth(savingsRows), [savingsRows]);
  const expenseMonthly = useMemo(() => groupByMonth(expenseRows), [expenseRows]);
  const incomeMonthly = useMemo(() => groupByMonth(incomeRows), [incomeRows]);

  const monthKeys = Array.from(new Set([...savingsMonthly, ...expenseMonthly, ...incomeMonthly].map((item) => item.month))).sort();

  const comparisonData = monthKeys.map((month) => {
    const monthSavings = savingsMonthly.find((item) => item.month === month)?.total || 0;
    const monthExpenses = expenseMonthly.find((item) => item.month === month)?.total || 0;
    return {
      label: savingsMonthly.find((item) => item.month === month)?.label || expenseMonthly.find((item) => item.month === month)?.label || month,
      savings: Number(monthSavings.toFixed(2)),
      expenses: Number(monthExpenses.toFixed(2)),
    };
  });

  let running = 0;
  const netSavingsSeries = monthKeys.map((month) => {
    const monthSavings = savingsMonthly.find((item) => item.month === month)?.total || 0;
    const monthIncome = incomeMonthly.find((item) => item.month === month)?.total || 0;
    const monthExpenses = expenseMonthly.find((item) => item.month === month)?.total || 0;
    running += monthIncome - monthExpenses + monthSavings;
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
        title="Savings Analytics"
        description="Measure savings consistency, retention rate, and net progress."
      />
      <FinanceSubNav />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total Savings" value={formatCurrency(savings)} subtext="All-time saved amount" />
        <MetricCard label="Savings Rate" value={formatPercent(savingsRate)} subtext="Savings as a share of income" />
        <MetricCard label="Net Position" value={formatCurrency(income - expenses + savings)} subtext="Income - expenses + savings" />
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

      {!loading && !savingsRows.length ? (
        <Card>
          <p className="text-sm text-zinc-400">No savings entries yet. Log transfers or savings contributions to begin tracking.</p>
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
