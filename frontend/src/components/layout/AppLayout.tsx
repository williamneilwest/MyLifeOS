import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { getModuleNavItems } from '../../routes/moduleRegistry';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const sidebarCollapsed = useAppStore((state) => state.preferences.sidebarCollapsed);
  const activeModules = useAppStore((state) => state.activeModules);
  const hideMobileTabs = useAppStore((state) => state.preferences.hideMobileTabs);
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
    </div>
  );
}
