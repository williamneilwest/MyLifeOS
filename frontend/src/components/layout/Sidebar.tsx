import { ChevronsLeft, ChevronsRight, LayoutGrid } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { getModuleNavItems } from '../../routes/moduleRegistry';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open: _open, onClose: _onClose }: SidebarProps) {
  const collapsed = useAppStore((state) => state.preferences.sidebarCollapsed);
  const activeModules = useAppStore((state) => state.activeModules);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const navItems = getModuleNavItems(activeModules);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 hidden border-r border-white/10 bg-black/40 backdrop-blur-md transition-all duration-200 lg:flex lg:flex-col',
        collapsed ? 'w-24' : 'w-72',
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-emerald-500/0 via-emerald-500/30 to-cyan-500/0" />

      <div className="flex items-start justify-between border-b border-white/10 px-4 py-4">
        {!collapsed ? (
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-2.5 py-1 text-xs uppercase tracking-wide text-zinc-400">
              <LayoutGrid className="h-3.5 w-3.5 text-emerald-300" />
              LifeOS
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">Command Center</h2>
            <p className="mt-1 text-sm text-zinc-400">Run your day from one place</p>
          </div>
        ) : (
          <div className="mx-auto rounded-xl border border-white/10 bg-zinc-900/70 p-2 text-emerald-300">
            <LayoutGrid className="h-4 w-4" />
          </div>
        )}

        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60 text-zinc-300 transition-all duration-200 hover:border-emerald-400/30 hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group flex min-h-10 items-center rounded-xl border border-transparent text-sm text-zinc-400 transition-all duration-200',
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                  'hover:border-white/10 hover:bg-zinc-900/60 hover:text-zinc-200',
                  'hover:shadow-[0_0_20px_rgba(16,185,129,0.10)]',
                  isActive && 'border-emerald-400/30 bg-zinc-900/80 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {!collapsed ? <span>{item.label}</span> : null}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
