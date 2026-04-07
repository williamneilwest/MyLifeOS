import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, SectionHeader } from '../../../components/ui';
import { financeOverviewService, type FinanceOverviewPayload } from '../../../services/financeOverviewService';
import { plaidService, type PlaidAccount } from '../../../services/plaidService';
import { useFinanceFiltersStore } from '../../../store/useFinanceFiltersStore';
import { FinanceCharts } from '../components/FinanceCharts';
import { FinanceSubNav } from '../components/FinanceSubNav';
import { FinanceTable } from '../components/FinanceTable';
import { MetricCard } from '../components/MetricCard';
import { useFinanceData } from '../hooks/useFinanceData';
import { useFinanceDashboardData } from '../hooks/useFinanceDashboardData';
import { accountCurrentBalance, isDebtAccount } from '../utils/accountMetrics';
import {
  calculatePayoffMonths,
  formatCurrency,
  formatPercent,
  groupByCategory,
  groupByMonth,
} from '../utils/financeAnalytics';

const DEBT_KEYWORDS = ['debt', 'loan', 'credit', 'mortgage', 'student', 'car note', 'minimum payment'];

function isDebtLikeCategory(category: string): boolean {
  const lower = category.toLowerCase();
  return DEBT_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function DebtPage() {
  const navigate = useNavigate();
  const { rows, loading, error } = useFinanceDashboardData();
  const [overview, setOverview] = useState<FinanceOverviewPayload | null>(null);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const accountIds = useFinanceFiltersStore((state) => state.accountIds);
  const categories = useFinanceFiltersStore((state) => state.categories);
  const types = useFinanceFiltersStore((state) => state.types);
  const timeRange = useFinanceFiltersStore((state) => state.timeRange);

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

  useEffect(() => {
    let isMounted = true;
    void plaidService
      .getAccounts(false)
      .then((payload) => {
        if (isMounted) {
          setAccounts(payload.accounts || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAccounts([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const { filteredAccounts, filteredTransactions, income, debt } = useFinanceData({
    accounts,
    transactions: rows,
    filters: {
      accountIds,
      categories,
      types,
      timeRange,
    },
  });

  const expenseRows = filteredTransactions.filter((row) => row.type === 'expense');
  const debtExpenseRows = expenseRows.filter((row) => isDebtLikeCategory(row.category || ''));
  const debtAccounts = filteredAccounts.filter((account) => isDebtAccount(account));
  const debtToIncomeRatioRaw = income > 0 ? (debt / income) * 100 : 0;
  const debtToIncomeRatio = Number.isFinite(debtToIncomeRatioRaw) ? debtToIncomeRatioRaw : 0;

  const minimumPaymentEstimate = overview?.financial_health.total_minimum_payments ?? debt * 0.02;
  const weightedApr =
    overview?.debts.length
      ? overview.debts.reduce((sum, debtItem) => sum + debtItem.interest_rate * debtItem.balance, 0) / Math.max(1, debt)
      : 7.5;

  const payoffMonths = calculatePayoffMonths(debt, minimumPaymentEstimate, weightedApr);

  const debtBreakdown = useMemo(() => {
    if (debtAccounts.length) {
      return debtAccounts.map((account) => ({
        name: account.name || account.subtype || account.type || 'Debt Account',
        total: Number(Math.abs(accountCurrentBalance(account)).toFixed(2)),
      }));
    }
    if (overview?.debts.length) {
      return overview.debts.map((debt) => ({ name: debt.type || debt.name, total: Number(debt.balance.toFixed(2)) }));
    }
    return groupByCategory(debtExpenseRows).slice(0, 8).map((item) => ({ name: item.category, total: Number(item.total.toFixed(2)) }));
  }, [debtAccounts, debtExpenseRows, overview?.debts]);

  const liabilityTrend = groupByMonth(debtExpenseRows).map((item) => ({ label: item.label, total: Number(item.total.toFixed(2)) }));

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
        title="Debt Analytics"
        description="Monitor debt load, payment pressure, and payoff trajectory."
      />
      <FinanceSubNav />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Debt" value={formatCurrency(debt)} subtext="Outstanding debt balance" />
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
