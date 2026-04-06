import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button, Card, Modal, SectionHeader } from '../../../components/ui';
import {
  financeOverviewService,
  type AllocationRuleItem,
  type DebtItem,
  type FinanceOverviewPayload,
  type IncomeSourceItem,
} from '../../../services/financeOverviewService';
import { plaidService, type PlaidAccount, type PlaidTransaction } from '../../../services/plaidService';
import { usePlaidSyncStore } from '../../../store/usePlaidSyncStore';
import type { FinanceEntry } from '../../../types';
import { AccountList } from '../components/AccountList';
import { FinanceForm } from '../components/FinanceForm';
import { FinanceSummary } from '../components/FinanceSummary';
import { useFinance } from '../hooks/useFinance';

const COLORS = ['#22d3ee', '#38bdf8', '#34d399'];
const PLAID_SCRIPT_SRC = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
const PLAID_DISCONNECTED_KEY = 'lifeos.plaid.disconnected';

function isPlaidDisconnectedLocally(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(PLAID_DISCONNECTED_KEY) === '1';
}

function setPlaidDisconnectedLocally(disconnected: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (disconnected) {
    window.localStorage.setItem(PLAID_DISCONNECTED_KEY, '1');
  } else {
    window.localStorage.removeItem(PLAID_DISCONNECTED_KEY);
  }
}

function loadPlaidScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Plaid) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${PLAID_SCRIPT_SRC}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Plaid script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = PLAID_SCRIPT_SRC;
    script.async = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Failed to load Plaid script')), { once: true });
    document.body.appendChild(script);
  });
}

function plaidToFinanceEntry(transaction: PlaidTransaction): FinanceEntry {
  const plaidAmount = Number(transaction.amount || 0);
  const isCredit = plaidAmount < 0;
  return {
    id: `plaid-${transaction.transaction_id}`,
    name: transaction.merchant_name || transaction.name || 'Plaid Transaction',
    category: transaction.category?.[0] || 'Linked Account',
    amount: Math.abs(plaidAmount),
    type: isCredit ? 'income' : 'expense',
    date: transaction.date,
  };
}

function formatLastSynced(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) {
    return 'Never';
  }
  const timestamp = new Date(lastSyncedAt);
  const minutesAgo = Math.max(0, Math.floor((Date.now() - timestamp.getTime()) / 60000));
  if (minutesAgo < 60) {
    return `${minutesAgo} minute${minutesAgo === 1 ? '' : 's'} ago`;
  }
  const hoursAgo = Math.floor(minutesAgo / 60);
  return `${hoursAgo} hour${hoursAgo === 1 ? '' : 's'} ago`;
}

function toCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function isLocalEntry(entry: FinanceEntry) {
  return !entry.id.startsWith('plaid-');
}

export function FinancePage() {
  const { addEntry, entries, updateEntry, deleteEntry } = useFinance();

  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<FinanceEntry['type']>('expense');
  const [editError, setEditError] = useState<string | null>(null);

  const [overview, setOverview] = useState<FinanceOverviewPayload | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtName, setDebtName] = useState('');
  const [debtType, setDebtType] = useState('');
  const [debtBalance, setDebtBalance] = useState('0');
  const [debtRate, setDebtRate] = useState('0');
  const [debtMinPayment, setDebtMinPayment] = useState('0');
  const [debtError, setDebtError] = useState<string | null>(null);

  const [editingIncome, setEditingIncome] = useState<IncomeSourceItem | null>(null);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('0');
  const [incomeError, setIncomeError] = useState<string | null>(null);

  const [editingAllocation, setEditingAllocation] = useState<AllocationRuleItem | null>(null);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [allocationCategory, setAllocationCategory] = useState<AllocationRuleItem['category']>('needs');
  const [allocationPercent, setAllocationPercent] = useState('0');
  const [allocationError, setAllocationError] = useState<string | null>(null);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountsLastSyncedAt, setAccountsLastSyncedAt] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const lastSyncedAt = usePlaidSyncStore((state) => state.lastSyncedAt);
  const isSyncing = usePlaidSyncStore((state) => state.isSyncing);
  const usingCachedData = usePlaidSyncStore((state) => state.usingCachedData);
  const plaidTransactions = usePlaidSyncStore((state) => state.transactions);
  const syncError = usePlaidSyncStore((state) => state.syncError);
  const syncWarning = usePlaidSyncStore((state) => state.syncWarning);
  const hydrateStatus = usePlaidSyncStore((state) => state.hydrateStatus);
  const syncTransactions = usePlaidSyncStore((state) => state.syncTransactions);
  const setTransactions = usePlaidSyncStore((state) => state.setTransactions);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const payload = await financeOverviewService.getOverview();
      setOverview(payload);
      setOverviewError(null);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Failed to load finance overview');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async (refresh = false) => {
    setAccountsLoading(true);
    try {
      const payload = await plaidService.getAccounts(refresh);
      if (isPlaidDisconnectedLocally()) {
        setPlaidAccounts([]);
        setSelectedAccountIds([]);
        setAccountsLastSyncedAt(null);
        setAccountsError(null);
        return;
      }
      const accounts = payload.accounts ?? [];
      setPlaidAccounts(accounts);
      setSelectedAccountIds(accounts.filter((account) => account.selected !== false).map((account) => account.id));
      setAccountsLastSyncedAt(payload.last_synced_at || null);
      setAccountsError(null);
    } catch (error) {
      if (isPlaidDisconnectedLocally()) {
        setPlaidAccounts([]);
        setSelectedAccountIds([]);
        setAccountsLastSyncedAt(null);
        setAccountsError(null);
        return;
      }
      setAccountsError(error instanceof Error ? error.message : 'Failed to load accounts');
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrateStatus();
    void loadOverview();
    void loadAccounts();
  }, [hydrateStatus, loadOverview, loadAccounts]);

  const handleSync = useCallback(
    async (force = false) => {
      await syncTransactions(force);
      await loadOverview();
      await loadAccounts(force);
    },
    [loadAccounts, loadOverview, syncTransactions],
  );

  const handlePlaidConnect = useCallback(async () => {
    try {
      await loadPlaidScript();
      const tokenResponse = await plaidService.createLinkToken();
      if (!window.Plaid) {
        throw new Error('Plaid Link failed to initialize');
      }
      const handler = window.Plaid.create({
        token: tokenResponse.link_token,
        onSuccess: (publicToken: string) => {
          void plaidService.exchangePublicToken(publicToken).then(async () => {
            setPlaidDisconnectedLocally(false);
            await loadAccounts(true);
            await handleSync(true);
          });
        },
      });
      handler.open();
    } catch {
      // Error surfaced through sync state on next sync attempt.
    }
  }, [handleSync, loadAccounts]);

  const toggleAccountSelection = useCallback(
    async (accountId: string) => {
      const next = selectedAccountIds.includes(accountId)
        ? selectedAccountIds.filter((id) => id !== accountId)
        : [...selectedAccountIds, accountId];

      setSelectedAccountIds(next);
      try {
        const payload = await plaidService.updateSelectedAccounts(next);
        const accounts = payload.accounts ?? [];
        setPlaidAccounts(accounts);
        setSelectedAccountIds(accounts.filter((account) => account.selected !== false).map((account) => account.id));
      } catch (error) {
        setAccountsError(error instanceof Error ? error.message : 'Failed to save selected accounts');
      }
    },
    [selectedAccountIds],
  );

  const disconnectAllPlaid = useCallback(async () => {
    const shouldProceed = window.confirm('Disconnect all Plaid accounts and clear cached Plaid data?');
    if (!shouldProceed) {
      return;
    }
    try {
      await plaidService.disconnectAll();
      setPlaidDisconnectedLocally(true);
      setPlaidAccounts([]);
      setSelectedAccountIds([]);
      setAccountsLastSyncedAt(null);
      setTransactions([]);
      setDisconnectError(null);
      await loadOverview();
    } catch (error) {
      setDisconnectError(error instanceof Error ? error.message : 'Failed to disconnect Plaid accounts');
    }
  }, [loadOverview, setTransactions]);

  const plaidEntries = useMemo(() => plaidTransactions.map(plaidToFinanceEntry), [plaidTransactions]);
  const allEntries = useMemo(
    () =>
      [...entries, ...plaidEntries].sort((left, right) => {
        if (left.date === right.date) {
          return right.id.localeCompare(left.id);
        }
        return right.date.localeCompare(left.date);
      }),
    [entries, plaidEntries],
  );

  const metrics = useMemo(() => {
    const income = allEntries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
    const expense = allEntries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
    const savings = allEntries.filter((entry) => entry.type === 'savings').reduce((sum, entry) => sum + entry.amount, 0);
    return {
      income,
      expense,
      savings,
      net: income - expense - savings,
      expenseRatio: income > 0 ? Math.round((expense / income) * 100) : 0,
    };
  }, [allEntries]);

  const chartData = useMemo(
    () => [
      { name: 'Income', value: metrics.income },
      { name: 'Expense', value: metrics.expense },
      { name: 'Savings', value: metrics.savings },
    ],
    [metrics.expense, metrics.income, metrics.savings],
  );

  const spendingRows = useMemo(() => {
    if (!overview) {
      return [];
    }
    return (['needs', 'wants', 'savings', 'debt'] as const).map((category) => ({
      category,
      planned: overview.spending_vs_plan.planned[category] ?? 0,
      actual: overview.spending_vs_plan.actual[category] ?? 0,
      overspending: overview.spending_vs_plan.overspending[category] ?? 0,
    }));
  }, [overview]);

  function openEditModal(entry: FinanceEntry) {
    setEditingEntry(entry);
    setEditName(entry.name);
    setEditCategory(entry.category);
    setEditAmount(String(entry.amount));
    setEditDate(entry.date);
    setEditType(entry.type);
    setEditError(null);
  }

  function closeEditModal() {
    setEditingEntry(null);
    setEditError(null);
  }

  async function saveLocalEdit() {
    if (!editingEntry) {
      return;
    }
    const amount = Number(editAmount);
    if (!Number.isFinite(amount)) {
      setEditError('Amount must be numeric');
      return;
    }

    try {
      await updateEntry(editingEntry.id, {
        name: editName.trim() || 'Entry',
        category: editCategory.trim() || 'General',
        amount,
        date: editDate,
        type: editType,
      });
      closeEditModal();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to update transaction');
    }
  }

  async function removeLocalEntry(entryId: string) {
    await deleteEntry(entryId);
  }

  function startCreateDebt() {
    setIsDebtModalOpen(true);
    setEditingDebt(null);
    setDebtName('');
    setDebtType('');
    setDebtBalance('0');
    setDebtRate('0');
    setDebtMinPayment('0');
    setDebtError(null);
  }

  function startEditDebt(debt: DebtItem) {
    setIsDebtModalOpen(true);
    setEditingDebt(debt);
    setDebtName(debt.name);
    setDebtType(debt.type);
    setDebtBalance(String(debt.balance));
    setDebtRate(String(debt.interest_rate));
    setDebtMinPayment(String(debt.minimum_payment));
    setDebtError(null);
  }

  function closeDebtModal() {
    setIsDebtModalOpen(false);
    setEditingDebt(null);
    setDebtName('');
    setDebtType('');
    setDebtBalance('0');
    setDebtRate('0');
    setDebtMinPayment('0');
    setDebtError(null);
  }

  async function saveDebt() {
    const balance = Number(debtBalance);
    const interestRate = Number(debtRate);
    const minimumPayment = Number(debtMinPayment);
    if (!Number.isFinite(balance) || !Number.isFinite(interestRate) || !Number.isFinite(minimumPayment)) {
      setDebtError('Debt values must be numeric');
      return;
    }

    try {
      if (editingDebt) {
        await financeOverviewService.updateDebt(editingDebt.id, {
          name: debtName,
          type: debtType,
          balance,
          interest_rate: interestRate,
          minimum_payment: minimumPayment,
        });
      } else {
        await financeOverviewService.createDebt({
          name: debtName,
          type: debtType,
          balance,
          interest_rate: interestRate,
          minimum_payment: minimumPayment,
        });
      }
      closeDebtModal();
      await loadOverview();
    } catch (error) {
      setDebtError(error instanceof Error ? error.message : 'Failed to save debt');
    }
  }

  async function removeDebt(id: string) {
    await financeOverviewService.deleteDebt(id);
    await loadOverview();
  }

  function startCreateIncome() {
    setIsIncomeModalOpen(true);
    setEditingIncome(null);
    setIncomeName('');
    setIncomeAmount('0');
    setIncomeError(null);
  }

  function startEditIncome(item: IncomeSourceItem) {
    setIsIncomeModalOpen(true);
    setEditingIncome(item);
    setIncomeName(item.name);
    setIncomeAmount(String(item.monthly_amount));
    setIncomeError(null);
  }

  function closeIncomeModal() {
    setIsIncomeModalOpen(false);
    setEditingIncome(null);
    setIncomeName('');
    setIncomeAmount('0');
    setIncomeError(null);
  }

  async function saveIncome() {
    const monthlyAmount = Number(incomeAmount);
    if (!Number.isFinite(monthlyAmount)) {
      setIncomeError('Monthly amount must be numeric');
      return;
    }

    try {
      if (editingIncome) {
        await financeOverviewService.updateIncomeSource(editingIncome.id, {
          name: incomeName,
          monthly_amount: monthlyAmount,
        });
      } else {
        await financeOverviewService.createIncomeSource({
          name: incomeName,
          monthly_amount: monthlyAmount,
        });
      }
      closeIncomeModal();
      await loadOverview();
    } catch (error) {
      setIncomeError(error instanceof Error ? error.message : 'Failed to save income source');
    }
  }

  async function removeIncome(id: string) {
    await financeOverviewService.deleteIncomeSource(id);
    await loadOverview();
  }

  function startCreateAllocation() {
    setIsAllocationModalOpen(true);
    setEditingAllocation(null);
    setAllocationCategory('needs');
    setAllocationPercent('0');
    setAllocationError(null);
  }

  function startEditAllocation(item: AllocationRuleItem) {
    setIsAllocationModalOpen(true);
    setEditingAllocation(item);
    setAllocationCategory(item.category);
    setAllocationPercent(String(item.percentage));
    setAllocationError(null);
  }

  function closeAllocationModal() {
    setIsAllocationModalOpen(false);
    setEditingAllocation(null);
    setAllocationCategory('needs');
    setAllocationPercent('0');
    setAllocationError(null);
  }

  async function saveAllocation() {
    const percentage = Number(allocationPercent);
    if (!Number.isFinite(percentage)) {
      setAllocationError('Allocation percent must be numeric');
      return;
    }

    try {
      if (editingAllocation) {
        await financeOverviewService.updateAllocationRule(editingAllocation.id, {
          category: allocationCategory,
          percentage,
        });
      } else {
        await financeOverviewService.createAllocationRule({
          category: allocationCategory,
          percentage,
        });
      }
      closeAllocationModal();
      await loadOverview();
    } catch (error) {
      setAllocationError(error instanceof Error ? error.message : 'Failed to save allocation rule');
    }
  }

  async function removeAllocation(id: string) {
    await financeOverviewService.deleteAllocationRule(id);
    await loadOverview();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module"
        title="Finance"
        description="Financial overview, debt and income planning, and Plaid-backed transaction insights."
        actions={<Badge variant={plaidTransactions.length > 0 ? 'success' : 'warning'}>{plaidTransactions.length > 0 ? 'Linked Data Active' : 'Not Linked'}</Badge>}
      />

      <FinanceSummary entries={allEntries} totalDebt={overview?.financial_health.total_debt ?? 0} />

      <section className="grid gap-4 sm:gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="h-[340px] sm:h-[360px]" title="Cashflow Mix" description="Manual and Plaid transactions combined.">
          <div className="h-[250px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={100} paddingAngle={5}>
                  {chartData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Plaid Sync" description="Manual sync only with cache-first safeguards.">
          <p className="text-sm text-slate-300">
            Last synced: <span className="text-white">{formatLastSynced(lastSyncedAt || overview?.last_synced_at || null)}</span>
          </p>
          <p className="mt-1 text-xs text-emerald-300">{usingCachedData ? 'Using cached data' : 'Fresh data from Plaid'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void handleSync()} disabled={isSyncing}>
              {isSyncing ? 'Syncing...' : 'Sync Transactions'}
            </Button>
            <Button variant="outline" onClick={() => void handlePlaidConnect()} disabled={isSyncing}>
              Connect Plaid
            </Button>
            <Button variant="ghost" className="text-rose-300 hover:text-rose-200" onClick={() => void disconnectAllPlaid()} disabled={isSyncing}>
              Disconnect Plaid
            </Button>
            <Badge variant={metrics.net >= 0 ? 'success' : 'warning'}>{metrics.net >= 0 ? 'Net Positive' : 'Net Negative'}</Badge>
            <Badge variant="info">Expense Ratio {metrics.expenseRatio}%</Badge>
          </div>
          {syncWarning ? (
            <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <p>{syncWarning.message}</p>
              <p className="mt-1 text-xs text-amber-100">Attempts in last 10 minutes: {syncWarning.attemptsInWindow}</p>
              {syncWarning.canForce ? (
                <div className="mt-2">
                  <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => void handleSync(true)} disabled={isSyncing}>
                    Force Sync Anyway
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          {syncError ? <p className="mt-3 text-sm text-rose-300">{syncError}</p> : null}
          {disconnectError ? <p className="mt-2 text-sm text-rose-300">{disconnectError}</p> : null}
          <div className="mt-5">
            <FinanceForm
              onSubmit={(entry) => {
                void addEntry(entry);
              }}
            />
          </div>
        </Card>
      </section>

      <Card title="Linked Accounts" description="All account types returned by Plaid. Select which accounts are active in your workflow.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="info">{plaidAccounts.length} account{plaidAccounts.length === 1 ? '' : 's'}</Badge>
          <Badge variant="neutral">{selectedAccountIds.length} selected</Badge>
          <p className="text-xs text-zinc-400">Last synced: {formatLastSynced(accountsLastSyncedAt)}</p>
          <div className="ml-auto">
            <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => void loadAccounts(true)} disabled={accountsLoading}>
              {accountsLoading ? 'Refreshing...' : 'Refresh Accounts'}
            </Button>
          </div>
        </div>
        {accountsError ? <p className="mb-2 text-sm text-rose-300">{accountsError}</p> : null}
        <AccountList accounts={plaidAccounts} selectedAccountIds={selectedAccountIds} onToggle={(accountId) => void toggleAccountSelection(accountId)} />
      </Card>

      <section className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-5">
        <Card variant="compact">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Total Debt</p>
          <p className="mt-2 text-2xl font-semibold text-white">{toCurrency(overview?.financial_health.total_debt ?? 0)}</p>
        </Card>
        <Card variant="compact">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Total Income</p>
          <p className="mt-2 text-2xl font-semibold text-white">{toCurrency(overview?.financial_health.total_income ?? 0)}</p>
        </Card>
        <Card variant="compact">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Debt-to-Income</p>
          <p className="mt-2 text-2xl font-semibold text-white">{(overview?.financial_health.debt_to_income_ratio ?? 0).toFixed(1)}%</p>
        </Card>
        <Card variant="compact">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Min Payments</p>
          <p className="mt-2 text-2xl font-semibold text-white">{toCurrency(overview?.financial_health.total_minimum_payments ?? 0)}</p>
        </Card>
        <Card variant="compact">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Health Status</p>
          <div className="mt-2">
            <Badge variant={overview?.financial_health.status === 'critical' ? 'warning' : overview?.financial_health.status === 'warning' ? 'info' : 'success'}>
              {(overview?.financial_health.status || 'good').toUpperCase()}
            </Badge>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <Card title="Debt Overview" description="Track loan balances, rates, and minimums.">
          <div className="mb-3 flex justify-end">
            <Button className="h-9 px-3 text-xs" onClick={startCreateDebt}>Add Debt</Button>
          </div>
          <div className="space-y-2">
            {(overview?.debts ?? []).map((debt) => (
              <div key={debt.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">{debt.name}</p>
                    <p className="text-xs text-zinc-400">{debt.type}</p>
                  </div>
                  <div className="text-right text-sm text-zinc-300">
                    <p>{toCurrency(debt.balance)}</p>
                    <p className="text-xs">{debt.interest_rate}% APR</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => startEditDebt(debt)}>Edit</Button>
                  <Button variant="ghost" className="h-8 px-3 text-xs text-rose-300" onClick={() => void removeDebt(debt.id)}>Remove</Button>
                </div>
              </div>
            ))}
            {!overviewLoading && (overview?.debts.length ?? 0) === 0 ? <p className="text-sm text-zinc-400">No debts added yet.</p> : null}
          </div>
        </Card>

        <Card title="Income + Allocation" description="Define monthly income and how you plan to allocate it.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-3 flex justify-between">
                <p className="text-sm text-zinc-300">Income Sources</p>
                <Button className="h-8 px-3 text-xs" onClick={startCreateIncome}>Add</Button>
              </div>
              <div className="space-y-2">
                {(overview?.income_sources ?? []).map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-white">{item.name}</span>
                      <span className="text-zinc-300">{toCurrency(item.monthly_amount)}</span>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button variant="outline" className="h-7 px-2 text-xs" onClick={() => startEditIncome(item)}>Edit</Button>
                      <Button variant="ghost" className="h-7 px-2 text-xs text-rose-300" onClick={() => void removeIncome(item.id)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex justify-between">
                <p className="text-sm text-zinc-300">Allocation Rules</p>
                <Button className="h-8 px-3 text-xs" onClick={startCreateAllocation}>Add</Button>
              </div>
              <div className="space-y-2">
                {(overview?.allocation_rules ?? []).map((rule) => (
                  <div key={rule.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="capitalize text-white">{rule.category}</span>
                      <span className="text-zinc-300">{rule.percentage}%</span>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button variant="outline" className="h-7 px-2 text-xs" onClick={() => startEditAllocation(rule)}>Edit</Button>
                      <Button variant="ghost" className="h-7 px-2 text-xs text-rose-300" onClick={() => void removeAllocation(rule.id)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <Card title="Spending vs Plan" description="Plaid transaction spending compared against your allocation plan.">
        <div className="h-[280px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spendingRows} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="category" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Bar dataKey="planned" fill="#34d399" />
              <Bar dataKey="actual" fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {spendingRows.map((row) => (
            <div key={row.category} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
              <p className="capitalize text-zinc-300">{row.category}</p>
              <p className="mt-1 text-white">Planned {toCurrency(row.planned)}</p>
              <p className="text-zinc-300">Actual {toCurrency(row.actual)}</p>
              <p className={row.overspending > 0 ? 'text-rose-300' : 'text-emerald-300'}>
                {row.overspending > 0 ? `Over by ${toCurrency(row.overspending)}` : 'On plan'}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
        <p className="mt-1 text-sm text-slate-400">Latest records across manual entries and Plaid cache.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allEntries.slice(0, 30).map((entry) => (
                <tr key={entry.id} className="border-t border-white/10 text-slate-200">
                  <td className="px-3 py-2">{entry.date}</td>
                  <td className="px-3 py-2">{entry.name}</td>
                  <td className="px-3 py-2">{entry.category}</td>
                  <td className="px-3 py-2 capitalize">{entry.type}</td>
                  <td className="px-3 py-2">{entry.id.startsWith('plaid-') ? 'Plaid' : 'Manual'}</td>
                  <td className="px-3 py-2 text-right">${entry.amount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">
                    {isLocalEntry(entry) ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => openEditModal(entry)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-9 px-3 text-xs text-rose-300 hover:text-rose-200"
                          onClick={() => {
                            void removeLocalEntry(entry.id);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Read only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isSyncing && allEntries.length === 0 ? <p className="px-3 py-3 text-sm text-slate-400">No finance data yet. Add an entry or sync Plaid.</p> : null}
          {overviewError ? <p className="px-3 py-2 text-sm text-rose-300">{overviewError}</p> : null}
        </div>
      </Card>

      <Modal title="Edit Local Transaction" open={Boolean(editingEntry)} onClose={closeEditModal}>
        <div className="space-y-3">
          <label className="block text-sm text-slate-300">
            Name
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Category
            <input
              value={editCategory}
              onChange={(event) => setEditCategory(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-300">
              Amount
              <input
                value={editAmount}
                onChange={(event) => setEditAmount(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Date
              <input
                type="date"
                value={editDate}
                onChange={(event) => setEditDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
          <label className="block text-sm text-slate-300">
            Type
            <select
              value={editType}
              onChange={(event) => setEditType(event.target.value as FinanceEntry['type'])}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="savings">Savings</option>
            </select>
          </label>
          {editError ? <p className="text-sm text-rose-300">{editError}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeEditModal}>Cancel</Button>
            <Button onClick={() => void saveLocalEdit()}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal title={editingDebt ? 'Edit Debt' : 'Add Debt'} open={isDebtModalOpen} onClose={closeDebtModal}>
        <div className="space-y-3">
          <label className="block text-sm text-slate-300">
            Name
            <input value={debtName} onChange={(event) => setDebtName(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white" />
          </label>
          <label className="block text-sm text-slate-300">
            Type
            <input value={debtType} onChange={(event) => setDebtType(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm text-slate-300">Balance<input value={debtBalance} onChange={(event) => setDebtBalance(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white" /></label>
            <label className="block text-sm text-slate-300">Interest %<input value={debtRate} onChange={(event) => setDebtRate(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white" /></label>
            <label className="block text-sm text-slate-300">Min Payment<input value={debtMinPayment} onChange={(event) => setDebtMinPayment(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white" /></label>
          </div>
          {debtError ? <p className="text-sm text-rose-300">{debtError}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeDebtModal}>Cancel</Button>
            <Button onClick={() => void saveDebt()}>{editingDebt ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <Modal title={editingIncome ? 'Edit Income Source' : 'Add Income Source'} open={isIncomeModalOpen} onClose={closeIncomeModal}>
        <div className="space-y-3">
          <label className="block text-sm text-slate-300">Name<input value={incomeName} onChange={(event) => setIncomeName(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white" /></label>
          <label className="block text-sm text-slate-300">Monthly Amount<input value={incomeAmount} onChange={(event) => setIncomeAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white" /></label>
          {incomeError ? <p className="text-sm text-rose-300">{incomeError}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeIncomeModal}>Cancel</Button>
            <Button onClick={() => void saveIncome()}>{editingIncome ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        title={editingAllocation ? 'Edit Allocation Rule' : 'Add Allocation Rule'}
        open={isAllocationModalOpen}
        onClose={closeAllocationModal}
      >
        <div className="space-y-3">
          <label className="block text-sm text-slate-300">
            Category
            <select value={allocationCategory} onChange={(event) => setAllocationCategory(event.target.value as AllocationRuleItem['category'])} className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white">
              <option value="needs">Needs</option>
              <option value="wants">Wants</option>
              <option value="savings">Savings</option>
              <option value="debt">Debt</option>
            </select>
          </label>
          <label className="block text-sm text-slate-300">Percentage<input value={allocationPercent} onChange={(event) => setAllocationPercent(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white" /></label>
          {allocationError ? <p className="text-sm text-rose-300">{allocationError}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeAllocationModal}>Cancel</Button>
            <Button onClick={() => void saveAllocation()}>{editingAllocation ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
