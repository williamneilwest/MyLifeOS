import { create } from 'zustand';

export interface AuthUser {
  id: string;
  username: string;
}

interface AuthState {
  user: AuthUser | null;
  checked: boolean;
  setUser: (user: AuthUser | null) => void;
  setChecked: (checked: boolean) => void;
  reset: () => void;
}

export const FINANCE_OWNER_USERNAME = String(import.meta.env.VITE_FINANCE_OWNER_USERNAME || 'will')
  .trim()
  .toLowerCase();

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  checked: false,
  setUser: (user) => set({ user }),
  setChecked: (checked) => set({ checked }),
  reset: () => set({ user: null, checked: false }),
}));
