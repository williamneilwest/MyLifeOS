import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, SectionHeader } from '../../../components/ui';
import { financeOverviewService, type FinanceOverviewPayload } from '../../../services/financeOverviewService';
import { FinanceCharts } from '../components/FinanceCharts';
import { FinanceTable } from '../components/FinanceTable';
import { MetricCard } from '../components/MetricCard';
import { useFinanceDashboardData } from '../hooks/useFinanceDashboardData';
import {
  calculatePayoffMonths,
  filterRowsByType,
  formatCurrency,
  formatPercent,
  groupByCategory,
  groupByMonth,
  sumAmount,
} from '../utils/financeAnalytics';

const DEBT_KEYWORDS = ['debt', 'loan', 'credit', 'mortgage', 'student', 'car note', 'minimum payment'];

function isDebtLikeCategory(category: string): boolean {
  const lower = category.toLowerCase();
  return DEBT_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function DebtPage() {
  const { rows, loading, error } = useFinanceDashboardData();
  const [overview, setOverview] = useState<FinanceOverviewPayload | null>(null);

  useEffect(() => {
    let isMounted = true;
    void financeOverviewService
      .getOverview()
      .then((payload) => {
        if (isMounted) {
          setOverview(payload);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOverview(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const incomeRows = filterRowsByType(rows, 'income');
  const expenseRows = filterRowsByType(rows, 'expense');
  const debtExpenseRows = expenseRows.filter((row) => isDebtLikeCategory(row.category || ''));

  const totalDebt = overview?.financial_health.total_debt ?? sumAmount(debtExpenseRows);
  const monthlyIncome = sumAmount(incomeRows);
  const debtToIncomeRatio = overview?.financial_health.debt_to_income_ratio ?? (monthlyIncome > 0 ? (totalDebt / monthlyIncome) * 100 : 0);

  const minimumPaymentEstimate = overview?.financial_health.total_minimum_payments ?? totalDebt * 0.02;
  const weightedApr =
    overview?.debts.length
      ? overview.debts.reduce((sum, debt) => sum + debt.interest_rate * debt.balance, 0) / Math.max(1, totalDebt)
      : 7.5;

  const payoffMonths = calculatePayoffMonths(totalDebt, minimumPaymentEstimate, weightedApr);

  const debtBreakdown = useMemo(() => {
    if (overview?.debts.length) {
      return overview.debts.map((debt) => ({ name: debt.type || debt.name, total: Number(debt.balance.toFixed(2)) }));
    }
    return groupByCategory(debtExpenseRows).slice(0, 8).map((item) => ({ name: item.category, total: Number(item.total.toFixed(2)) }));
  }, [debtExpenseRows, overview?.debts]);

  const liabilityTrend = groupByMonth(debtExpenseRows).map((item) => ({ label: item.label, total: Number(item.total.toFixed(2)) }));

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Finance"
        title="Debt Analytics"
        description="Monitor debt load, payment pressure, and payoff trajectory."
        actions={
          <Link to="/finance">
            <Button variant="outline" className="gap-2"><ArrowLeft size={16} />Back to Finance</Button>
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Debt" value={formatCurrency(totalDebt)} subtext="Outstanding debt balance" />
        <MetricCard label="Debt vs Income" value={formatPercent(debtToIncomeRatio)} subtext="Debt-to-income ratio" />
        <MetricCard
          label="Estimated Payoff Time"
          value={payoffMonths ? `${payoffMonths} months` : 'Not estimable'}
          subtext="Based on minimum payment estimate"
        />
        <MetricCard label="Minimum Payment Est." value={formatCurrency(minimumPaymentEstimate)} subtext="2% fallback if payment data is missing" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card title="Debt Breakdown" description="By debt type when available.">
          <FinanceCharts type="pie" data={debtBreakdown} yKey="total" nameKey="name" />
        </Card>

        <Card title="Monthly Liability Trend" description="Debt-related outflows by month.">
          <FinanceCharts type="line" data={liabilityTrend} xKey="label" yKey="total" />
        </Card>
      </section>

      <Card>
        <FinanceTable rows={debtExpenseRows} title="Debt-Related Transactions" />
      </Card>

      {!loading && !debtExpenseRows.length ? <Card><p className="text-sm text-zinc-400">No debt-specific transactions detected yet. Use categories like loan, credit, or mortgage for better tracking.</p></Card> : null}
      {error ? <Card><p className="text-sm text-rose-300">{error}</p></Card> : null}
    </div>
  );
}
