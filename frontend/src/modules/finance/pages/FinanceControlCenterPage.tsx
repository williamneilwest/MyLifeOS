import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Eye, EyeOff, GripVertical, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge, Button, Card, Modal, SectionHeader } from '../../../components/ui';
import {
  financeOverviewService,
  type AllocationRuleItem,
  type DebtItem,
  type FinanceOverviewPayload,
  type IncomeSourceItem,
} from '../../../services/financeOverviewService';
import { plaidService, type PlaidAccount } from '../../../services/plaidService';
import { useFinanceFiltersStore } from '../../../store/useFinanceFiltersStore';
import { usePlaidSyncStore } from '../../../store/usePlaidSyncStore';
import type { FinanceEntry } from '../../../types';
import { ControlBar, type TimeRangeValue } from '../components/ControlBar';
import { DetailDrawer } from '../components/DetailDrawer';
import { FilterPanel } from '../components/FilterPanel';
import { FinanceSubNav } from '../components/FinanceSubNav';
import { useFinanceDashboardData } from '../hooks/useFinanceDashboardData';
import { useFinanceData } from '../hooks/useFinanceData';
import { useFinance } from '../hooks/useFinance';
import { isSelectedAccount } from '../utils/accountMetrics';

const PLAID_SCRIPT_SRC = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
const PLAID_DISCONNECTED_KEY = 'lifeos.plaid.disconnected';
const LAYOUT_STORAGE_KEY = 'finance.overview.layout.v1';

type OverviewCardId = 'spending' | 'categories' | 'insights';

interface LayoutConfig {
  visibleCards: OverviewCardId[];
  order: OverviewCardId[];
}

const ALL_CARDS: OverviewCardId[] = ['spending', 'categories', 'insights'];

function getDefaultLayout(): LayoutConfig {
  return {
    visibleCards: [...ALL_CARDS],
    order: [...ALL_CARDS],
  };
}

function loadLayoutConfig(): LayoutConfig {
  if (typeof window === 'undefined') {
    return getDefaultLayout();
  }

  const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (!raw) {
    return getDefaultLayout();
  }

  try {
    const parsed = JSON.parse(raw) as LayoutConfig;
    const visibleCards = ALL_CARDS.filter((cardId) => parsed.visibleCards?.includes(cardId));
    const order = ALL_CARDS.filter((cardId) => parsed.order?.includes(cardId));
    return {
      visibleCards: visibleCards.length ? visibleCards : [...ALL_CARDS],
      order: order.length ? order : [...ALL_CARDS],
    };
  } catch {
    return getDefaultLayout();
  }
}

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

function isLocalEntry(entry: FinanceEntry) {
  return !entry.id.startsWith('plaid-');
}

function toCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function dedupeAccounts(accounts: PlaidAccount[]): PlaidAccount[] {
  const seen = new Set<string>();
  const deduped: PlaidAccount[] = [];

  for (const account of accounts) {
    const key = account.id || account.account_id || '';
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(account);
  }

  return deduped;
}

interface SortableOverviewCardProps {
  id: OverviewCardId;
  adminMode: boolean;
  title: string;
  visible: boolean;
  onToggleVisibility: (id: OverviewCardId) => void;
  children: ReactNode;
}

function SortableOverviewCard({ id, adminMode, title, visible, onToggleVisibility, children }: SortableOverviewCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !adminMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-70' : ''}>
      <Card className="h-full">
        {adminMode ? (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-2 py-1.5 text-xs text-zinc-300">
            <span>{title}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" className="h-7 px-2" onClick={() => onToggleVisibility(id)}>
                {visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </Button>
              <Button variant="ghost" className="h-7 px-2" disabled>
                <Settings2 size={14} />
              </Button>
              <Button variant="ghost" className="h-7 px-2" {...attributes} {...listeners}>
                <GripVertical size={14} />
              </Button>
            </div>
          </div>
        ) : null}
        {children}
      </Card>
    </div>
  );
}

export function FinancePage() {
  const navigate = useNavigate();
  const { addEntry, updateEntry, deleteEntry } = useFinance();
  const [layout, setLayout] = useState<LayoutConfig>(() => loadLayoutConfig());
  const [adminMode, setAdminMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

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

  const { rows } = useFinanceDashboardData();
  const accountFilterIds = useFinanceFiltersStore((state) => state.accountIds);
  const categoryFilters = useFinanceFiltersStore((state) => state.categories);
  const typeFilters = useFinanceFiltersStore((state) => state.types);
  const timeRange = useFinanceFiltersStore((state) => state.timeRange);
  const setGlobalFilters = useFinanceFiltersStore((state) => state.setFilters);
  const initializeAccounts = useFinanceFiltersStore((state) => state.initializeAccounts);
  const resetGlobalFilters = useFinanceFiltersStore((state) => state.reset);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [draftAccountFilterIds, setDraftAccountFilterIds] = useState<string[]>([]);
  const [draftCategoryFilters, setDraftCategoryFilters] = useState<string[]>([]);
  const [draftTypeFilters, setDraftTypeFilters] = useState<Array<'income' | 'expense' | 'savings'>>([]);
  const [draftTimeRange, setDraftTimeRange] = useState<TimeRangeValue>('month');
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const lastSyncedAt = usePlaidSyncStore((state) => state.lastSyncedAt);
  const isSyncing = usePlaidSyncStore((state) => state.isSyncing);
  const usingCachedData = usePlaidSyncStore((state) => state.usingCachedData);
  const plaidTransactions = usePlaidSyncStore((state) => state.transactions);
  const syncError = usePlaidSyncStore((state) => state.syncError);
  const syncWarning = usePlaidSyncStore((state) => state.syncWarning);
  const hydrateStatus = usePlaidSyncStore((state) => state.hydrateStatus);
  const syncTransactions = usePlaidSyncStore((state) => state.syncTransactions);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  const orderedVisibleCards = useMemo(
    () => layout.order.filter((id) => layout.visibleCards.includes(id)),
    [layout],
  );

  function toggleCardVisibility(cardId: OverviewCardId) {
    setLayout((current) => {
      const isVisible = current.visibleCards.includes(cardId);
      const visibleCards = isVisible
        ? current.visibleCards.filter((id) => id !== cardId)
        : [...current.visibleCards, cardId];

      return {
        ...current,
        visibleCards: visibleCards.length ? visibleCards : [cardId],
      };
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setLayout((current) => {
      const oldIndex = current.order.indexOf(active.id as OverviewCardId);
      const newIndex = current.order.indexOf(over.id as OverviewCardId);
      if (oldIndex === -1 || newIndex === -1) {
        return current;
      }
      return {
        ...current,
        order: arrayMove(current.order, oldIndex, newIndex),
      };
    });
  }

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
      const accounts = dedupeAccounts(payload.accounts ?? []);
      const selected = accounts.filter((account) => isSelectedAccount(account)).map((account) => account.id);
      const currentAccountFilterIds = useFinanceFiltersStore.getState().accountIds;

      setPlaidAccounts(accounts);
      setSelectedAccountIds(selected);
      initializeAccounts(selected);
      if (currentAccountFilterIds.length) {
        const intersection = currentAccountFilterIds.filter((id) => selected.includes(id));
        if (intersection.length !== currentAccountFilterIds.length) {
          setGlobalFilters({ accountIds: intersection.length ? intersection : selected });
        }
      }
      if (accounts.length > 0) {
        setPlaidDisconnectedLocally(false);
      }
      setAccountsLastSyncedAt(payload.last_synced_at || null);
      setAccountsError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load accounts';
      const noLinkedAccount = message.toLowerCase().includes('no linked plaid account');
      if (noLinkedAccount) {
        setPlaidDisconnectedLocally(true);
        setPlaidAccounts([]);
        setSelectedAccountIds([]);
        setGlobalFilters({ accountIds: [] });
        setAccountsLastSyncedAt(null);
      }
      setAccountsError(message);
    } finally {
      setAccountsLoading(false);
    }
  }, [initializeAccounts, setGlobalFilters]);

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
        const accounts = dedupeAccounts(payload.accounts ?? []);
        const selected = accounts.filter((account) => isSelectedAccount(account)).map((account) => account.id);

        setPlaidAccounts(accounts);
        setSelectedAccountIds(selected);
        setGlobalFilters({
          accountIds: (() => {
            if (!accountFilterIds.length) {
              return selected;
            }
            const intersection = accountFilterIds.filter((id) => selected.includes(id));
            return intersection.length ? intersection : selected;
          })(),
        });
      } catch (error) {
        setAccountsError(error instanceof Error ? error.message : 'Failed to save selected accounts');
      }
    },
    [accountFilterIds, selectedAccountIds, setGlobalFilters],
  );

  const toggleDraftAccountFilter = useCallback((accountId: string) => {
    setDraftAccountFilterIds((previous) => (previous.includes(accountId) ? previous.filter((id) => id !== accountId) : [...previous, accountId]));
  }, []);

  const toggleDraftCategoryFilter = useCallback((category: string) => {
    setDraftCategoryFilters((previous) => (previous.includes(category) ? previous.filter((item) => item !== category) : [...previous, category]));
  }, []);

  const toggleDraftTypeFilter = useCallback((type: 'income' | 'expense' | 'savings') => {
    setDraftTypeFilters((previous) => (previous.includes(type) ? previous.filter((item) => item !== type) : [...previous, type]));
  }, []);

  useEffect(() => {
    if (!isFilterPanelOpen) {
      return;
    }
    setDraftAccountFilterIds(accountFilterIds);
    setDraftCategoryFilters(categoryFilters);
    setDraftTypeFilters(typeFilters);
    setDraftTimeRange(timeRange);
  }, [accountFilterIds, categoryFilters, isFilterPanelOpen, timeRange, typeFilters]);

  function applyFilters() {
    setGlobalFilters({
      accountIds: draftAccountFilterIds,
      categories: draftCategoryFilters,
      types: draftTypeFilters,
      timeRange: draftTimeRange,
    });
    setIsFilterPanelOpen(false);
  }

  function resetFilters() {
    const defaultAccounts = selectedAccountIds.length ? selectedAccountIds : plaidAccounts.map((account) => account.id);
    resetGlobalFilters(defaultAccounts);
    setDraftAccountFilterIds(defaultAccounts);
    setDraftCategoryFilters([]);
    setDraftTypeFilters([]);
    setDraftTimeRange('month');
  }

  const disconnectAllPlaid = useCallback(async () => {
    const shouldProceed = window.confirm('Disconnect all Plaid accounts and clear active account selection?');
    if (!shouldProceed) {
      return;
    }
    try {
      await plaidService.disconnectAll();
      setPlaidDisconnectedLocally(true);
      setPlaidAccounts([]);
      setSelectedAccountIds([]);
      setGlobalFilters({ accountIds: [] });
      setAccountsLastSyncedAt(null);
      setDisconnectError(null);
      await loadOverview();
    } catch (error) {
      setDisconnectError(error instanceof Error ? error.message : 'Failed to disconnect Plaid accounts');
    }
  }, [loadOverview, setGlobalFilters]);

  const { filteredTransactions, accountScopedTransactions, income, expenses, savings, debt, netBalance } = useFinanceData({
    accounts: plaidAccounts,
    transactions: rows,
    filters: {
      accountIds: accountFilterIds,
      categories: categoryFilters,
      types: typeFilters,
      timeRange,
    },
  });

  const availableCategories = useMemo(() => {
    return Array.from(new Set(accountScopedTransactions.map((entry) => entry.category || 'Uncategorized'))).sort((left, right) =>
      left.localeCompare(right),
    );
  }, [accountScopedTransactions]);

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

  const categoryBreakdown = useMemo(() => {
    const categories = filteredTransactions
      .filter((entry) => entry.type === 'expense')
      .reduce<Record<string, number>>((accumulator, entry) => {
        const key = entry.category || 'Uncategorized';
        accumulator[key] = (accumulator[key] || 0) + entry.amount;
        return accumulator;
      }, {});

    return Object.entries(categories)
      .map(([category, amount]) => ({ category, amount }))
      .sort((left, right) => right.amount - left.amount);
  }, [filteredTransactions]);

  const historical = useMemo(() => {
    const bucket = filteredTransactions.reduce<Record<string, { income: number; expenses: number; savings: number }>>((accumulator, entry) => {
      const month = entry.date.slice(0, 7);
      if (!accumulator[month]) {
        accumulator[month] = { income: 0, expenses: 0, savings: 0 };
      }

      if (entry.type === 'income') {
        accumulator[month].income += entry.amount;
      } else if (entry.type === 'expense') {
        accumulator[month].expenses += entry.amount;
      } else {
        accumulator[month].savings += entry.amount;
      }

      return accumulator;
    }, {});

    return Object.entries(bucket)
      .sort((left, right) => right[0].localeCompare(left[0]))
      .slice(0, 8)
      .map(([month, values]) => ({
        month,
        income: values.income,
        expenses: values.expenses,
        savings: values.savings,
        net: values.income - values.expenses - values.savings,
      }));
  }, [filteredTransactions]);

  const insightMessages = useMemo(() => {
    const overspendingTotal = spendingRows.reduce((sum, row) => sum + row.overspending, 0);
    const savingsRow = spendingRows.find((row) => row.category === 'savings');
    const topCategory = categoryBreakdown[0];

    return [
      {
        id: 'overspending',
        tone: overspendingTotal > 0 ? 'warning' : 'success',
        title: overspendingTotal > 0 ? 'Overspending Alert' : 'Spending is on plan',
        detail: overspendingTotal > 0 ? `You are ${toCurrency(overspendingTotal)} over your planned allocations.` : 'No category is currently over plan.',
      },
      {
        id: 'savings',
        tone: (savingsRow?.actual ?? 0) < (savingsRow?.planned ?? 0) ? 'info' : 'success',
        title: 'Savings Suggestion',
        detail:
          (savingsRow?.actual ?? 0) < (savingsRow?.planned ?? 0)
            ? `Redirect ${toCurrency((savingsRow?.planned ?? 0) - (savingsRow?.actual ?? 0))} into savings to hit plan.`
            : 'Savings are meeting or exceeding your current plan.',
      },
      {
        id: 'top-category',
        tone: 'info',
        title: 'Top Spending Category',
        detail: topCategory ? `${topCategory.category} leads at ${toCurrency(topCategory.amount)} for this range.` : 'No spending category data yet.',
      },
    ];
  }, [categoryBreakdown, spendingRows]);

  const accountsSummary = useMemo(() => {
    const total = plaidAccounts.length;
    const active = accountFilterIds.length;
    return `Accounts: ${active} active${total ? ` of ${total}` : ''}`;
  }, [accountFilterIds.length, plaidAccounts.length]);

  const categoriesSummary = useMemo(() => {
    if (!categoryFilters.length) {
      return 'Categories: All';
    }
    const preview = categoryFilters.slice(0, 2).join(', ');
    const extra = categoryFilters.length > 2 ? ` +${categoryFilters.length - 2}` : '';
    return `Categories: ${preview}${extra}`;
  }, [categoryFilters]);

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

  function renderOverviewCard(cardId: OverviewCardId) {
    if (cardId === 'spending') {
      return (
        <>
          <h3 className="text-base font-semibold text-white">Spending vs Plan</h3>
          <p className="mt-1 text-sm text-zinc-400">Primary view of actual cash movement versus plan.</p>
          <div className="mt-3 h-[230px] sm:h-[260px]">
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
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {spendingRows.map((row) => (
              <div key={row.category} className="rounded-lg border border-white/10 bg-black/20 p-2.5 text-sm">
                <p className="capitalize text-zinc-300">{row.category}</p>
                <p className="mt-1 text-white">Actual {toCurrency(row.actual)}</p>
                <p className="text-zinc-400">Plan {toCurrency(row.planned)}</p>
              </div>
            ))}
          </div>
        </>
      );
    }

    if (cardId === 'categories') {
      return (
        <>
          <h3 className="text-base font-semibold text-white">Category Breakdown</h3>
          <p className="mt-1 text-sm text-zinc-400">Top spending categories for this range.</p>
          <div className="mt-3 space-y-2">
            {categoryBreakdown.slice(0, 5).map((item, index) => (
              <div key={item.category} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="info">#{index + 1}</Badge>
                  <span className="text-sm text-zinc-200">{item.category}</span>
                </div>
                <span className="text-sm font-medium text-white">{toCurrency(item.amount)}</span>
              </div>
            ))}
            {!categoryBreakdown.length ? <p className="text-sm text-zinc-400">No category data for selected range.</p> : null}
          </div>
        </>
      );
    }

    return (
      <>
        <h3 className="text-base font-semibold text-white">Action Insights</h3>
        <p className="mt-1 text-sm text-zinc-400">Dynamic recommendations from current behavior.</p>
        <div className="mt-3 space-y-2">
          {insightMessages.map((message) => (
            <div key={message.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{message.title}</p>
                <Badge variant={message.tone === 'warning' ? 'warning' : message.tone === 'success' ? 'success' : 'info'}>
                  {message.tone.toUpperCase()}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-zinc-300">{message.detail}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-start justify-start">
        <Button
          variant="ghost"
          className="h-8 gap-1 px-2 text-xs text-zinc-300"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
              return;
            }
            navigate('/');
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      </div>

      <SectionHeader
        eyebrow="Module"
        title="Finance Control Center"
        description="Action-focused dashboard with drill-down details hidden by default."
        actions={
          <div className="flex items-center gap-2">
            <Button variant={adminMode ? 'primary' : 'outline'} className="h-8 px-3 text-xs" onClick={() => setAdminMode((current) => !current)}>
              {adminMode ? 'Admin On' : 'Admin Mode'}
            </Button>
            <Badge variant={plaidTransactions.length > 0 ? 'success' : 'warning'}>{plaidTransactions.length > 0 ? 'Linked Data Active' : 'Not Linked'}</Badge>
          </div>
        }
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
        timeRange={timeRange}
        onTimeRangeChange={(value) => {
          setDraftTimeRange(value);
          setGlobalFilters({ timeRange: value });
        }}
        onOpenFilters={() => setIsFilterPanelOpen(true)}
        onOpenSettings={() => setIsDetailOpen(true)}
      />

      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        accounts={plaidAccounts}
        selectedAccountIds={draftAccountFilterIds}
        onToggleAccount={toggleDraftAccountFilter}
        categories={availableCategories}
        selectedCategories={draftCategoryFilters}
        onToggleCategory={toggleDraftCategoryFilter}
        selectedTypes={draftTypeFilters}
        onToggleType={toggleDraftTypeFilter}
        timeRange={draftTimeRange}
        onTimeRangeChange={setDraftTimeRange}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={orderedVisibleCards} strategy={rectSortingStrategy}>
          <section className="grid gap-4 xl:grid-cols-2">
            {orderedVisibleCards.map((cardId) => (
              <SortableOverviewCard
                key={cardId}
                id={cardId}
                adminMode={adminMode}
                title={cardId === 'spending' ? 'Spending vs Plan' : cardId === 'categories' ? 'Category Breakdown' : 'Action Insights'}
                visible={layout.visibleCards.includes(cardId)}
                onToggleVisibility={toggleCardVisibility}
              >
                {renderOverviewCard(cardId)}
              </SortableOverviewCard>
            ))}
          </section>
        </SortableContext>
      </DndContext>

      <DetailDrawer
        isOpen={isDetailOpen}
        onToggleOpen={() => setIsDetailOpen((previous) => !previous)}
        onClose={() => setIsDetailOpen(false)}
        entries={filteredTransactions}
        onEditEntry={openEditModal}
        onRemoveEntry={(entryId) => {
          void removeLocalEntry(entryId);
        }}
        isLocalEntry={isLocalEntry}
        categories={categoryBreakdown}
        historical={historical}
        overview={overview}
        overviewLoading={overviewLoading}
        overviewError={overviewError}
        plaidAccounts={plaidAccounts}
        selectedAccountIds={selectedAccountIds}
        onToggleAccountSelection={(accountId) => {
          void toggleAccountSelection(accountId);
        }}
        accountsLoading={accountsLoading}
        accountsError={accountsError}
        accountsLastSynced={formatLastSynced(accountsLastSyncedAt || lastSyncedAt || overview?.last_synced_at || null)}
        onRefreshAccounts={() => {
          void handleSync(true);
        }}
        isSyncing={isSyncing}
        usingCachedData={usingCachedData}
        syncError={syncError || disconnectError}
        syncWarning={syncWarning}
        onSync={(force) => {
          void handleSync(force);
        }}
        onConnectPlaid={() => {
          void handlePlaidConnect();
        }}
        onDisconnectPlaid={() => {
          void disconnectAllPlaid();
        }}
        onCreateEntry={(entry) => {
          void addEntry(entry).then(async () => {
            await hydrateStatus();
          });
        }}
        onCreateDebt={startCreateDebt}
        onEditDebt={startEditDebt}
        onRemoveDebt={(id) => {
          void removeDebt(id);
        }}
        onCreateIncome={startCreateIncome}
        onEditIncome={startEditIncome}
        onRemoveIncome={(id) => {
          void removeIncome(id);
        }}
        onCreateAllocation={startCreateAllocation}
        onEditAllocation={startEditAllocation}
        onRemoveAllocation={(id) => {
          void removeAllocation(id);
        }}
      />

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
