import type { PlaidAccount } from '../../../services/plaidService';

interface AccountCardProps {
  account: PlaidAccount;
  selected: boolean;
  onToggle: (id: string) => void;
}

function labelForAccount(account: PlaidAccount): string {
  const accountType = (account.type || '').toLowerCase();
  if (accountType === 'credit' || (account.subtype || '').toLowerCase().includes('credit')) return 'Balance Owed';
  if (accountType === 'loan') return 'Remaining Balance';
  if (accountType === 'investment') return 'Total Value';
  return 'Current Balance';
}

export function AccountCard({ account, selected, onToggle }: AccountCardProps) {
  const id = account.id || account.account_id || '';
  const balance = account.current_balance ?? account.balance ?? 0;

  return (
    <label className="block min-h-[44px] rounded-xl border border-white/10 bg-zinc-950/60 p-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={selected}
          onChange={() => onToggle(id)}
          aria-label={`Select ${account.name}`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{account.name}</p>
          <p className="mt-1 text-xs text-zinc-400">
            {account.type || 'unknown'}{account.subtype ? ` • ${account.subtype}` : ''}
            {account.mask ? ` • •••• ${account.mask}` : ''}
          </p>
          <p className="mt-2 text-sm text-emerald-300">
            {labelForAccount(account)}: ${Number(balance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </label>
  );
}
