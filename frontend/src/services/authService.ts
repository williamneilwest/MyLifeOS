import { apiClient } from './apiClient';

export interface AuthUser {
  id: string;
  username: string;
  created_at: string | null;
}

export const authService = {
  me: () => apiClient.get<{ user: AuthUser }>('/auth/me'),
  login: (username: string, password: string) =>
    apiClient.post<{ user: AuthUser }>('/auth/login', { username, password }),
  register: (username: string, password: string) =>
    apiClient.post<{ user: AuthUser }>('/auth/register', { username, password }),
  logout: () => apiClient.post<{ logged_out: boolean }>('/auth/logout', {}),
};
