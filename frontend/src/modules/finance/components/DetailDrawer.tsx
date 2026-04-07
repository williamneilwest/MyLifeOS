import { useEffect, useMemo, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button } from '../../../components/ui';
import type { AllocationRuleItem, DebtItem, FinanceOverviewPayload, IncomeSourceItem } from '../../../services/financeOverviewService';
import type { PlaidAccount } from '../../../services/plaidService';
import type { FinanceEntry } from '../../../types';
import { AccountChips } from './AccountChips';
import { FinanceForm } from './FinanceForm';

interface CategoryBreakdownRow {
  category: string;
  amount: number;
}

interface HistoricalRow {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  net: number;
}

interface DetailDrawerProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  entries: FinanceEntry[];
  onEditEntry: (entry: FinanceEntry) => void;
  onRemoveEntry: (entryId: string) => void;
  isLocalEntry: (entry: FinanceEntry) => boolean;
  categories: CategoryBreakdownRow[];
  historical: HistoricalRow[];
  overview: FinanceOverviewPayload | null;
  overviewLoading: boolean;
  overviewError: string | null;
  plaidAccounts: PlaidAccount[];
  selectedAccountIds: string[];
  onToggleAccountSelection: (accountId: string) => void;
  accountsLoading: boolean;
  accountsError: string | null;
  accountsLastSynced: string;
  onRefreshAccounts: () => void;
  isSyncing: boolean;
  usingCachedData: boolean;
  syncError: string | null;
  syncWarning: { message: string; attemptsInWindow?: number; canForce?: boolean } | null;
  onSync: (force?: boolean) => void;
  onConnectPlaid: () => void;
  onDisconnectPlaid: () => void;
  onCreateEntry: (entry: FinanceEntry) => void;
  onCreateDebt: () => void;
  onEditDebt: (debt: DebtItem) => void;
  onRemoveDebt: (id: string) => void;
  onCreateIncome: () => void;
  onEditIncome: (item: IncomeSourceItem) => void;
  onRemoveIncome: (id: string) => void;
  onCreateAllocation: () => void;
  onEditAllocation: (item: AllocationRuleItem) => void;
  onRemoveAllocation: (id: string) => void;
}

function toCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

type ModalTab = 'transactions' | 'categories' | 'accounts';

function exportEntriesCsv(entries: FinanceEntry[]): void {
  const escapeCsv = (value: string) => value.split('"').join('""');
  const lines = [
    ['Date', 'Name', 'Category', 'Type', 'Amount'].join(','),
    ...entries.map((entry) => [entry.date, `"${escapeCsv(entry.name)}"`, `"${escapeCsv(entry.category)}"`, entry.type, String(entry.amount)].join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'finance-transactions.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function DetailDrawer({
  isOpen,
  onToggleOpen,
  onClose,
  entries,
  onEditEntry,
  onRemoveEntry,
  isLocalEntry,
  categories,
  plaidAccounts,
  selectedAccountIds,
  onToggleAccountSelection,
  accountsLoading,
  accountsError,
  accountsLastSynced,
  onRefreshAccounts,
  isSyncing,
  usingCachedData,
  syncError,
  onSync,
  onConnectPlaid,
  onDisconnectPlaid,
  onCreateEntry,
}: DetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('transactions');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeydown);
    };
  }, [isOpen, onClose]);

  const categoryChartData = useMemo(
    () => categories.slice(0, 8).map((item) => ({ name: item.category, total: Number(item.amount.toFixed(2)) })),
    [categories],
  );

  return (
    <>
      <section className="rounded-xl border border-white/10 bg-zinc-900/70">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-emerald-500/5"
          aria-expanded={isOpen}
        >
          <div>
            <p className="text-sm font-semibold text-white">Open Command Panel</p>
            <p className="text-xs text-zinc-400">Fast transaction, category, and account controls.</p>
          </div>
          <Badge variant="info">Panel</Badge>
        </button>
      </section>

      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
          aria-label="Close panel"
        />

        <section
          className={`relative z-10 flex h-[70vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl border border-emerald-400/25 bg-zinc-900/55 backdrop-blur-2xl transition-all duration-200 ${
            isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Transactions Overview"
        >
          <header className="sticky top-0 z-20 border-b border-emerald-400/20 bg-zinc-900/45 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">Transactions Overview</h3>
                <p className="text-xs text-zinc-400">Filter by account and switch context instantly.</p>
              </div>
              <Button variant="ghost" className="h-8 px-2 text-zinc-300" onClick={onClose}>
                <X size={16} />
              </Button>
            </div>

            <div className="mt-3 flex items-center gap-1 rounded-lg bg-black/20 p-1">
              {([
                { id: 'transactions', label: 'Transactions' },
                { id: 'categories', label: 'Categories' },
                { id: 'accounts', label: 'Accounts' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    activeTab === tab.id
                      ? 'bg-emerald-500/20 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.2)]'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {showAddForm ? (
              <div className="mb-3 rounded-xl border border-emerald-400/20 bg-black/20 p-3">
                <FinanceForm
                  onSubmit={(entry) => {
                    onCreateEntry(entry);
                    setShowAddForm(false);
                  }}
                />
              </div>
            ) : null}

            {activeTab === 'transactions' ? (
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, 30).map((entry) => (
                      <tr key={entry.id} className="border-t border-white/10 text-slate-200">
                        <td className="px-3 py-2">{entry.date}</td>
                        <td className="px-3 py-2">{entry.name}</td>
                        <td className="px-3 py-2">{entry.category}</td>
                        <td className="px-3 py-2 capitalize">{entry.type}</td>
                        <td className="px-3 py-2 text-right">{toCurrency(entry.amount)}</td>
                        <td className="px-3 py-2 text-right">
                          {isLocalEntry(entry) ? (
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => onEditEntry(entry)}>
                                Edit
                              </Button>
                              <Button variant="ghost" className="h-8 px-2 text-xs text-rose-300" onClick={() => onRemoveEntry(entry.id)}>
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-500">Read only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {entries.length === 0 ? <p className="px-3 py-3 text-sm text-zinc-400">No transactions available for this filter.</p> : null}
              </div>
            ) : null}

            {activeTab === 'categories' ? (
              <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="h-[280px] rounded-xl border border-white/10 bg-black/20 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#34d399" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {categories.slice(0, 8).map((item) => (
                    <div key={item.category} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      <span className="text-sm text-zinc-300">{item.category}</span>
                      <span className="text-sm font-medium text-white">{toCurrency(item.amount)}</span>
                    </div>
                  ))}
                  {categories.length === 0 ? <p className="text-sm text-zinc-400">No category breakdown data yet.</p> : null}
                </div>
              </div>
            ) : null}

            {activeTab === 'accounts' ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="info">{plaidAccounts.length} accounts</Badge>
                    <Badge variant="neutral">{selectedAccountIds.length} active</Badge>
                    <Badge variant="info">{usingCachedData ? 'Cached' : 'Fresh'}</Badge>
                    <p className="text-xs text-zinc-400">Last synced: {accountsLastSynced}</p>
                  </div>
                  <AccountChips accounts={plaidAccounts} selectedAccountIds={selectedAccountIds} onToggle={onToggleAccountSelection} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button className="h-8 px-3 text-xs" onClick={() => onSync()} disabled={isSyncing}>
                      {isSyncing ? 'Syncing...' : 'Sync'}
                    </Button>
                    <Button variant="outline" className="h-8 px-3 text-xs" onClick={onConnectPlaid} disabled={isSyncing}>
                      Connect
                    </Button>
                    <Button variant="outline" className="h-8 px-3 text-xs" onClick={onRefreshAccounts} disabled={accountsLoading || isSyncing}>
                      {accountsLoading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Button variant="ghost" className="h-8 px-3 text-xs text-rose-300" onClick={onDisconnectPlaid} disabled={isSyncing}>
                      Disconnect
                    </Button>
                  </div>
                </div>

                {accountsError ? <p className="text-sm text-rose-300">{accountsError}</p> : null}
                {syncError ? <p className="text-sm text-rose-300">{syncError}</p> : null}
              </div>
            ) : null}
          </div>

          <footer className="sticky bottom-0 border-t border-emerald-400/20 bg-zinc-900/45 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button className="h-8 px-3 text-xs" onClick={() => setShowAddForm((current) => !current)}>
                  {showAddForm ? 'Hide Entry' : 'Add Entry'}
                </Button>
                <Button variant="outline" className="h-8 gap-1 px-3 text-xs" onClick={() => exportEntriesCsv(entries)}>
                  <Download size={14} />
                  Export
                </Button>
              </div>
              <Button variant="ghost" className="h-8 px-3 text-xs" onClick={onClose}>
                Close
              </Button>
            </div>
          </footer>
        </section>
      </div>
    </>
  );
}
