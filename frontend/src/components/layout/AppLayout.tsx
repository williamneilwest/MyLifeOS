import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { getModuleNavItems } from '../../routes/moduleRegistry';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();
  const sidebarCollapsed = useAppStore((state) => state.preferences.sidebarCollapsed);
  const activeModules = useAppStore((state) => state.activeModules);
  const setActiveModules = useAppStore((state) => state.setActiveModules);
  const hideMobileTabs = useAppStore((state) => state.preferences.hideMobileTabs);
  const toggleHideMobileTabs = useAppStore((state) => state.toggleHideMobileTabs);
  const navItems = getModuleNavItems(activeModules);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="h-screen overflow-hidden bg-zinc-950 text-zinc-200">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={cn('relative flex h-full min-w-0 flex-1 flex-col overflow-hidden transition-all duration-200', sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72')}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.10),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(6,182,212,0.10),transparent_26%)]" />

        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="relative flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {!hideMobileTabs ? (
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/60 px-2 pb-[calc(env(safe-area-inset-bottom,0)+0.9rem)] pt-3 backdrop-blur-md lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'min-h-[64px] min-w-[86px] flex-1 flex-col items-center justify-center rounded-2xl border border-transparent px-3 py-3 text-[11px] uppercase tracking-wide text-zinc-400 transition-all duration-200 flex',
                    isActive ? 'border-emerald-400/30 bg-zinc-900/90 text-white' : 'hover:border-white/10 hover:bg-zinc-900/70',
                  )
                }
              >
                <Icon className="mb-1 h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
      ) : null}

      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0)+1rem)] left-3 z-50 rounded-full border border-white/15 bg-zinc-900/90 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur hover:border-cyan-300/40 lg:bottom-4 lg:left-4"
      >
        Settings
      </button>

      {settingsOpen ? (
        <div className="fixed inset-0 z-[60] bg-zinc-950/75" onClick={() => setSettingsOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-zinc-900 p-4 lg:bottom-4 lg:left-4 lg:right-auto lg:top-auto lg:w-[360px] lg:rounded-2xl lg:border"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Settings</p>
              <button className="rounded border border-white/10 px-2 py-1 text-xs text-slate-300" onClick={() => setSettingsOpen(false)}>Close</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Navigation</p>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-slate-200">Hide bottom tabs</span>
                  <input type="checkbox" checked={hideMobileTabs} onChange={toggleHideMobileTabs} />
                </label>
              </div>
              <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Module Visibility</p>
                <div className="space-y-2">
                  {getModuleNavItems(['workplace', 'dashboard', 'tools']).map((item) => {
                    const active = activeModules.includes(item.id);
                    return (
                      <label key={item.id} className="flex items-center justify-between gap-2">
                        <span className="text-slate-200">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => {
                            const next = active
                              ? activeModules.filter((id) => id !== item.id)
                              : [...activeModules, item.id];
                            setActiveModules(next.length ? next : activeModules);
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3 text-xs text-slate-300">
                Manage quick links in Workplace and tool modules in Tools.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
