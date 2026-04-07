import { useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button, Card, SectionHeader } from '../../../components/ui';
import { ControlBar } from '../components/ControlBar';
import { FilterPanel } from '../components/FilterPanel';
import { FinanceCharts } from '../components/FinanceCharts';
import { FinanceSubNav } from '../components/FinanceSubNav';
import { FinanceSummary } from '../components/FinanceSummary';
import { FinanceTable } from '../components/FinanceTable';
import { useFinanceModuleData } from '../hooks/useFinanceModuleData';
import { filterRowsByType, formatCurrency, groupByCategory, groupByMonth } from '../utils/financeAnalytics';

export function FinancePage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const {
    rows,
    loading,
    error,
    filters,
    netBalance,
    income,
    expenses,
    savings,
    debt,
    availableCategories,
    accounts,
    accountsSummary,
    categoriesSummary,
    setTimeRange,
    toggleAccount,
    toggleCategory,
    toggleType,
    clearFilters,
  } = useFinanceModuleData();

  const spendingRows = useMemo(() => filterRowsByType(rows, 'expense'), [rows]);
  const monthlyTrend = useMemo(() => groupByMonth(rows), [rows]);
  const topCategories = useMemo(
    () => groupByCategory(spendingRows).slice(0, 6).map((item) => ({ name: item.category, total: Number(item.total.toFixed(2)) })),
    [spendingRows],
  );

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        eyebrow="Finance"
        title="Control Center"
        description="A unified overview of income, expenses, savings, debt, and transaction activity."
      />

      <FinanceSubNav />

      <ControlBar
        netBalance={netBalance}
        summary={[
          { label: 'Income', value: income },
          { label: 'Expenses', value: expenses },
          { label: 'Savings', value: savings },
          { label: 'Debt', value: debt },
        ]}
        accountsSummary={accountsSummary}
        categoriesSummary={categoriesSummary}
        timeRange={filters.timeRange}
        onTimeRangeChange={setTimeRange}
        onOpenFilters={() => setIsFilterOpen(true)}
        onOpenSettings={() => setIsFilterOpen(true)}
      />

      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        accounts={accounts}
        selectedAccountIds={filters.accountIds}
        onToggleAccount={toggleAccount}
        categories={availableCategories}
        selectedCategories={filters.categories}
        onToggleCategory={toggleCategory}
        selectedTypes={filters.types}
        onToggleType={toggleType}
        timeRange={filters.timeRange}
        onTimeRangeChange={setTimeRange}
        onApply={() => setIsFilterOpen(false)}
        onReset={clearFilters}
      />

      {error ? (
        <Card>
          <p className="text-sm text-rose-300">{error}</p>
        </Card>
      ) : null}

      <FinanceSummary
        entries={rows.map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          amount: row.amount,
          type: row.type,
          date: row.date,
        }))}
        totalDebt={debt}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <Card title="Cashflow Trend" description="Monthly totals across all selected transactions.">
          <FinanceCharts type="line" data={monthlyTrend} xKey="label" yKey="total" />
        </Card>

        <Card title="Top Spending Categories" description="Highest expense categories by total amount.">
          <FinanceCharts type="bar" data={topCategories} xKey="name" yKey="total" />
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Income</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(income)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Expenses</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(expenses)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Savings</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(savings)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Debt</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(debt)}</p>
        </Card>
      </section>

      <Card title="All Transactions" description={loading ? 'Loading latest data...' : `${rows.length} total rows`}>
        <FinanceTable rows={rows} maxRows={100} />
      </Card>

      {!loading && !rows.length ? (
        <Card>
          <p className="text-sm text-zinc-400">No transactions found for the current filter set.</p>
          <Button className="mt-3 h-9 gap-2 px-3 text-sm" onClick={clearFilters}>
            <Settings2 size={14} />
            Reset filters
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

export default FinancePage;
