import { ApiError, apiClient } from './apiClient';
import type { FinanceEntry } from '../types';

interface ListResponse<T> {
  data: T[];
  lastUpdated: string;
}

export const financeService = {
  getAll: () => apiClient.get<ListResponse<FinanceEntry>>('/finance/'),
  async getById(id: string) {
    try {
      return await apiClient.get<FinanceEntry>(`/finance/${id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  create: (data: FinanceEntry) => apiClient.post<FinanceEntry>('/finance/', data),
  async update(id: string, updates: Partial<FinanceEntry>) {
    try {
      return await apiClient.patch<FinanceEntry>(`/finance/${id}`, updates);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  async delete(id: string) {
    try {
      await apiClient.delete(`/finance/${id}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  },
  async getLastUpdated() {
    const payload = await apiClient.get<{ lastUpdated: string }>('/finance/last-updated');
    return payload.lastUpdated;
  },
};
