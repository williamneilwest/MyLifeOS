import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';
export type ModuleId = 'dashboard' | 'ai-builder' | 'finance' | 'projects' | 'homelab' | 'tasks' | 'planning' | 'tools' | 'database';

export interface UserPreferences {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
}

export interface QuickStats {
  netWorth: number;
  activeProjects: number;
  pendingTasks: number;
  homelabUptime: number;
}

interface AppStore {
  preferences: UserPreferences;
  quickStats: QuickStats;
  activeModules: ModuleId[];
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setActiveModules: (modules: ModuleId[]) => void;
  setQuickStats: (stats: Partial<QuickStats>) => void;
}

export const defaultActiveModules: ModuleId[] = ['dashboard', 'ai-builder', 'finance', 'projects', 'homelab', 'tasks', 'planning', 'tools', 'database'];

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      preferences: {
        theme: 'dark',
        sidebarCollapsed: false,
      },
      quickStats: {
        netWorth: 248500,
        activeProjects: 4,
        pendingTasks: 9,
        homelabUptime: 99.7,
      },
      activeModules: defaultActiveModules,
      toggleTheme: () =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            theme: state.preferences.theme === 'dark' ? 'light' : 'dark',
          },
        })),
      toggleSidebar: () =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            sidebarCollapsed: !state.preferences.sidebarCollapsed,
          },
        })),
      setActiveModules: (modules) => set({ activeModules: modules }),
      setQuickStats: (stats) =>
        set((state) => ({
          quickStats: {
            ...state.quickStats,
            ...stats,
          },
        })),
    }),
    {
      name: 'life-os-app-store',
      partialize: (state) => ({
        preferences: state.preferences,
        activeModules: state.activeModules,
      }),
    },
  ),
);
