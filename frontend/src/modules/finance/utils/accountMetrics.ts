import type { PlaidAccount } from '../../../services/plaidService';

export function isSelectedAccount(account: PlaidAccount): boolean {
  return (account.selected ?? account.is_selected ?? true) === true;
}

export function accountCurrentBalance(account: PlaidAccount): number {
  return Number(account.current_balance ?? 0);
}

export function isSavingsSubtype(account: PlaidAccount): boolean {
  return (account.subtype || '').toLowerCase() === 'savings';
}

export function isDebtAccount(account: PlaidAccount): boolean {
  const type = (account.type || '').toLowerCase();
  const subtype = (account.subtype || '').toLowerCase();
  return type === 'credit' || subtype === 'loan';
}
