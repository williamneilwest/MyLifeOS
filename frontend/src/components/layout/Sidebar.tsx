import { NavLink } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { moduleNavItems } from '../../routes/moduleRegistry';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';

export function Sidebar() {
  const collapsed = useAppStore((state) => state.preferences.sidebarCollapsed);
  const activeModules = useAppStore((state) => state.activeModules);

  const navItems = moduleNavItems.filter((item) => activeModules.includes(item.id));

  return (
    <aside
      className={cn(
        'glass-panel sticky top-4 hidden h-[calc(100vh-2rem)] flex-col rounded-3xl transition-all duration-300 lg:flex',
        collapsed ? 'w-20 p-3' : 'w-72 p-4',
      )}
    >
      <div className="mb-8 flex items-center gap-3 px-2 py-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-slate-900">
          <Landmark className="h-5 w-5" />
        </div>
        {!collapsed ? (
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Life OS</p>
            <h1 className="text-lg font-semibold text-white">Command Center</h1>
          </div>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                  isActive ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-300 hover:bg-white/8 hover:text-white',
                  collapsed && 'justify-center px-0',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {!collapsed ? <span>{item.label}</span> : null}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
