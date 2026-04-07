import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { PlaidAccount } from '../../../services/plaidService';
import type { TimeRangeValue } from './ControlBar';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: PlaidAccount[];
  selectedAccountIds: string[];
  onToggleAccount: (accountId: string) => void;
  categories: string[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  selectedTypes: Array<'income' | 'expense' | 'savings'>;
  onToggleType: (type: 'income' | 'expense' | 'savings') => void;
  timeRange: TimeRangeValue;
  onTimeRangeChange: (value: TimeRangeValue) => void;
  onApply: () => void;
  onReset: () => void;
}

function accountLabel(account: PlaidAccount): string {
  const subtype = account.subtype?.trim();
  return subtype || account.name;
}

export function FilterPanel({
  isOpen,
  onClose,
  accounts,
  selectedAccountIds,
  onToggleAccount,
  categories,
  selectedCategories,
  onToggleCategory,
  selectedTypes,
  onToggleType,
  timeRange,
  onTimeRangeChange,
  onApply,
  onReset,
}: FilterPanelProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [isOpen, onClose]);

  return (
    <div className={`fixed inset-0 z-50 transition ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <button
        type="button"
        aria-label="Close filters"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      <aside
        className={`absolute inset-x-0 bottom-0 max-h-[82vh] rounded-t-2xl border border-emerald-400/20 bg-zinc-950/95 shadow-2xl transition-transform duration-200 md:inset-y-0 md:left-auto md:w-[420px] md:max-h-none md:rounded-none md:rounded-l-2xl ${
          isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'
        }`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-900/90 px-4 py-3 backdrop-blur-md">
          <div>
            <h3 className="text-sm font-semibold text-white">Filters</h3>
            <p className="text-xs text-zinc-400">Adjust account, category, date, and type.</p>
          </div>
          <Button variant="ghost" className="h-9 w-9 p-0" onClick={onClose}>
            <X size={16} />
          </Button>
        </header>

        <div className="max-h-[calc(82vh-126px)] space-y-5 overflow-y-auto px-4 py-4 md:max-h-[calc(100vh-126px)]">
          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Accounts</p>
            <div className="space-y-2">
              {accounts.map((account) => (
                <label key={account.id} className="flex min-h-[44px] items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedAccountIds.includes(account.id)}
                    onChange={() => onToggleAccount(account.id)}
                  />
                  <span className="truncate">{accountLabel(account)}</span>
                </label>
              ))}
              {!accounts.length ? <p className="text-sm text-zinc-400">No linked accounts available.</p> : null}
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Categories</p>
            <div className="space-y-2">
              {categories.slice(0, 30).map((category) => (
                <label key={category} className="flex min-h-[44px] items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedCategories.includes(category)}
                    onChange={() => onToggleCategory(category)}
                  />
                  <span className="truncate">{category}</span>
                </label>
              ))}
              {!categories.length ? <p className="text-sm text-zinc-400">No categories found.</p> : null}
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Date Range</p>
            <select
              value={timeRange}
              onChange={(event) => onTimeRangeChange(event.target.value as TimeRangeValue)}
              className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white"
            >
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="quarter">Last 90 days</option>
              <option value="year">This year</option>
              <option value="all">All time</option>
            </select>
          </section>

          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Transaction Type</p>
            <div className="space-y-2">
              {(['income', 'expense', 'savings'] as const).map((type) => (
                <label key={type} className="flex min-h-[44px] items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm capitalize text-zinc-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedTypes.includes(type)}
                    onChange={() => onToggleType(type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </section>
        </div>

        <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-white/10 bg-zinc-900/90 px-4 py-3 backdrop-blur-md">
          <Button variant="outline" className="h-10 px-4 text-sm" onClick={onReset}>
            Reset
          </Button>
          <Button className="h-10 px-4 text-sm" onClick={onApply}>
            Apply
          </Button>
        </footer>
      </aside>
    </div>
  );
}
