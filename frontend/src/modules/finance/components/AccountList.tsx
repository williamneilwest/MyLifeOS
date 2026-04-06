import type { PlaidAccount } from '../../../services/plaidService';
import { AccountCard } from './AccountCard';

interface AccountListProps {
  accounts: PlaidAccount[];
  selectedAccountIds: string[];
  onToggle: (accountId: string) => void;
}

export function AccountList({ accounts, selectedAccountIds, onToggle }: AccountListProps) {
  if (!accounts.length) {
    return <p className="text-sm text-zinc-400">No linked Plaid accounts yet.</p>;
  }

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {accounts.map((account) => {
        const id = account.id || account.account_id || '';
        return <AccountCard key={id} account={account} selected={selectedAccountIds.includes(id)} onToggle={onToggle} />;
      })}
    </div>
  );
}
