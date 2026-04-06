import { apiClient } from './apiClient';

export interface DebtItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  interest_rate: number;
  minimum_payment: number;
}

export interface IncomeSourceItem {
  id: string;
  name: string;
  monthly_amount: number;
}

export type AllocationCategory = 'needs' | 'wants' | 'savings' | 'debt';

export interface AllocationRuleItem {
  id: string;
  category: AllocationCategory;
  percentage: number;
}

export interface FinanceOverviewPayload {
  last_synced_at: string | null;
  debts: DebtItem[];
  income_sources: IncomeSourceItem[];
  allocation_rules: AllocationRuleItem[];
  transactions: unknown[];
  financial_health: {
    total_debt: number;
    total_income: number;
    debt_to_income_ratio: number;
    total_minimum_payments: number;
    remaining_income_after_allocation: number;
    status: 'good' | 'warning' | 'critical' | string;
  };
  spending_vs_plan: {
    planned: Record<AllocationCategory, number>;
    actual: Record<AllocationCategory, number>;
    overspending: Record<AllocationCategory, number>;
  };
}

export const financeOverviewService = {
  getOverview: () => apiClient.get<FinanceOverviewPayload>('/finance/overview'),
  createDebt: (payload: Omit<DebtItem, 'id'>) => apiClient.post<DebtItem>('/finance/debts', payload),
  updateDebt: (id: string, payload: Partial<Omit<DebtItem, 'id'>>) => apiClient.patch<DebtItem>(`/finance/debts/${id}`, payload),
  deleteDebt: (id: string) => apiClient.delete(`/finance/debts/${id}`),

  createIncomeSource: (payload: Omit<IncomeSourceItem, 'id'>) => apiClient.post<IncomeSourceItem>('/finance/income', payload),
  updateIncomeSource: (id: string, payload: Partial<Omit<IncomeSourceItem, 'id'>>) => apiClient.patch<IncomeSourceItem>(`/finance/income/${id}`, payload),
  deleteIncomeSource: (id: string) => apiClient.delete(`/finance/income/${id}`),

  createAllocationRule: (payload: Omit<AllocationRuleItem, 'id'>) => apiClient.post<AllocationRuleItem>('/finance/allocation', payload),
  updateAllocationRule: (id: string, payload: Partial<Omit<AllocationRuleItem, 'id'>>) => apiClient.patch<AllocationRuleItem>(`/finance/allocation/${id}`, payload),
  deleteAllocationRule: (id: string) => apiClient.delete(`/finance/allocation/${id}`),
};
