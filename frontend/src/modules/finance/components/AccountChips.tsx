import type { PlaidAccount } from '../../../services/plaidService';
import { cn } from '../../../utils/cn';

interface AccountChipsProps {
  accounts: PlaidAccount[];
  selectedAccountIds: string[];
  onToggle: (accountId: string) => void;
}

function getAccountId(account: PlaidAccount): string {
  return account.id || account.account_id || '';
}

function chipLabel(account: PlaidAccount): string {
  const subtype = account.subtype?.trim();
  if (subtype) {
    return subtype
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  return account.name;
}

export function AccountChips({ accounts, selectedAccountIds, onToggle }: AccountChipsProps) {
  if (!accounts.length) {
    return <p className="text-sm text-zinc-400">No linked Plaid accounts yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {accounts.map((account) => {
        const accountId = getAccountId(account);
        const active = selectedAccountIds.includes(accountId);

        return (
          <button
            key={accountId}
            type="button"
            onClick={() => onToggle(accountId)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:text-sm',
              active
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.2)] hover:bg-emerald-500/20'
                : 'border-rose-300/20 bg-zinc-900/70 text-zinc-400 hover:border-zinc-500/40 hover:text-zinc-200',
            )}
          >
            <span className={cn('text-sm', active ? 'text-emerald-300' : 'text-rose-300')}>{active ? '+' : '-'}</span>
            <span className="max-w-[130px] truncate">{chipLabel(account)}</span>
          </button>
        );
      })}
    </div>
  );
}
