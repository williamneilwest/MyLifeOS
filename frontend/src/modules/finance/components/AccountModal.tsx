import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { PlaidAccount } from '../../../services/plaidService';
import { AccountToggle } from './AccountToggle';

type AccountFilter = 'all' | 'checking' | 'savings' | 'credit' | 'investment';

interface AccountModalProps {
  open: boolean;
  accounts: PlaidAccount[];
  selectedAccountIds: string[];
  onClose: () => void;
  onToggle: (accountId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

function getAccountId(account: PlaidAccount): string {
  return account.id || account.account_id || '';
}

function normalize(value?: string | null): string {
  return (value || '').toLowerCase();
}

function balanceFor(account: PlaidAccount): number {
  return Number(account.current_balance ?? account.balance ?? 0);
}

function matchesFilter(account: PlaidAccount, filter: AccountFilter): boolean {
  if (filter === 'all') {
    return true;
  }

  const type = normalize(account.type);
  const subtype = normalize(account.subtype);
  if (filter === 'checking') {
    return subtype.includes('checking') || type.includes('depository');
  }
  if (filter === 'savings') {
    return subtype.includes('savings');
  }
  if (filter === 'credit') {
    return type.includes('credit') || subtype.includes('credit');
  }
  return type.includes('investment') || subtype.includes('401k') || subtype.includes('ira') || subtype.includes('brokerage');
}

export function AccountModal({
  open,
  accounts,
  selectedAccountIds,
  onClose,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: AccountModalProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AccountFilter>('all');

  useEffect(() => {
    if (!open) {
      return;
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setFilter('all');
    }
  }, [open]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return accounts.filter((account) => {
      if (!matchesFilter(account, filter)) {
        return false;
      }
      if (!query) {
        return true;
      }

      const target = `${account.name} ${account.type || ''} ${account.subtype || ''} ${account.mask || ''}`.toLowerCase();
      return target.includes(query);
    });
  }, [accounts, filter, search]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-white/10 bg-zinc-900/95 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Manage Linked Accounts</h3>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-zinc-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search accounts"
              className="w-full rounded-xl border border-white/10 bg-zinc-950/60 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-400/40"
            />
          </div>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as AccountFilter)}
            className="rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-400/40"
          >
            <option value="all">All Types</option>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit">Credit</option>
            <option value="investment">Investment</option>
          </select>

          <div className="flex gap-2">
            <Button variant="outline" className="h-9 px-3 text-xs" onClick={onSelectAll}>Select All</Button>
            <Button variant="outline" className="h-9 px-3 text-xs" onClick={onDeselectAll}>Deselect All</Button>
          </div>
        </div>

        <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
          {filteredAccounts.map((account) => {
            const id = getAccountId(account);
            const selected = selectedAccountIds.includes(id);
            return (
              <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3 transition hover:border-emerald-400/30">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{account.name}</p>
                  <p className="truncate text-xs text-zinc-400">
                    {(account.type || 'unknown').toLowerCase()}
                    {account.subtype ? ` • ${account.subtype}` : ''}
                    {account.mask ? ` • •••• ${account.mask}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-emerald-300">
                    ${balanceFor(account).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <AccountToggle checked={selected} onChange={() => onToggle(id)} ariaLabel={`Toggle ${account.name}`} />
              </div>
            );
          })}
          {!filteredAccounts.length ? <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-400">No accounts match your filters.</p> : null}
        </div>
      </div>
    </div>
  );
}
