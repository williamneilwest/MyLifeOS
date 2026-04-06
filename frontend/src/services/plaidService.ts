import { ApiError, apiClient } from './apiClient';

export interface PlaidAccount {
  id: string;
  account_id?: string;
  name: string;
  mask?: string | null;
  type?: string | null;
  subtype?: string | null;
  current_balance?: number | null;
  available_balance?: number | null;
  balance?: number | null;
  selected?: boolean;
}

export interface PlaidTransaction {
  id?: string;
  transaction_id: string;
  account_id: string;
  name: string;
  amount: number;
  category?: string[];
  date: string;
  pending?: boolean;
  merchant_name?: string | null;
}

export interface PlaidAccountsResponse {
  accounts: PlaidAccount[];
  last_synced_at: string | null;
  cached?: boolean;
}

export interface PlaidSyncResponse {
  transactions: PlaidTransaction[];
  last_synced_at: string | null;
  cached: boolean;
  warning?: {
    message: string;
    attempts_in_window?: number;
    can_force?: boolean;
  } | null;
}

function normalizeAccount(account: PlaidAccount): PlaidAccount {
  return {
    ...account,
    id: account.id || account.account_id || '',
    balance: account.current_balance ?? account.balance ?? 0,
    selected: account.selected ?? true,
  };
}

export const plaidService = {
  createLinkToken: () => apiClient.post<{ link_token: string }>('/plaid/create-link-token', {}),
  exchangePublicToken: (publicToken: string) => apiClient.post('/plaid/exchange-token', { public_token: publicToken }),
  getAccounts: async (refresh = false): Promise<PlaidAccountsResponse> => {
    if (refresh) {
      try {
        await apiClient.post('/plaid/sync?force=true', {});
      } catch (error) {
        const isNoLinkedAccount =
          error instanceof ApiError &&
          error.status === 400 &&
          error.message.toLowerCase().includes('no linked plaid account');
        if (!isNoLinkedAccount) {
          throw error;
        }
      }
    }
    const payload = await apiClient.get<PlaidAccountsResponse>('/plaid/accounts');
    return {
      ...payload,
      accounts: (payload.accounts || []).map(normalizeAccount),
    };
  },
  getTransactions: (limit = 1000) => apiClient.get<{ transactions: PlaidTransaction[]; last_synced_at: string | null; cached?: boolean }>(`/plaid/transactions?limit=${limit}`),
  syncTransactions: (force = false) => apiClient.post<PlaidSyncResponse>(`/plaid/sync${force ? '?force=true' : ''}`, {}),
  getSyncStatus: () => apiClient.get<{ last_synced_at: string | null; should_sync: boolean; transactions: PlaidTransaction[] }>('/plaid/sync-status'),
  updateSelectedAccounts: async (selectedAccountIds: string[]) => {
    const payload = await apiClient.patch<{ accounts: PlaidAccount[] }>('/plaid/accounts/selection', {
      selected_account_ids: selectedAccountIds,
    });
    return {
      accounts: (payload.accounts || []).map(normalizeAccount),
    };
  },
  disconnectAll: () => apiClient.post('/plaid/disconnect-all', {}),
};
