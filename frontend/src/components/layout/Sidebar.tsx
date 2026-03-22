import { LayoutGrid, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { moduleNavItems } from '../../routes/moduleRegistry';
import { cn } from '../../utils/cn';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close sidebar overlay"
        className={cn(
          'fixed inset-0 z-40 bg-black/60 transition-all duration-200 lg:hidden',
          open ? 'visible opacity-100' : 'invisible opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-black/40 backdrop-blur-md transition-all duration-200',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-emerald-500/0 via-emerald-500/30 to-cyan-500/0" />

        <div className="flex items-start justify-between border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-2.5 py-1 text-xs uppercase tracking-wide text-zinc-400">
              <LayoutGrid className="h-3.5 w-3.5 text-emerald-300" />
              LifeOS
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">Command Center</h2>
            <p className="mt-1 text-sm text-zinc-400">Run your day from one place</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60 text-zinc-300 transition-all duration-200 hover:border-emerald-400/30 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 p-3">
          {moduleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'group flex min-h-10 items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-zinc-400 transition-all duration-200',
                    'hover:border-white/10 hover:bg-zinc-900/60 hover:text-zinc-200',
                    'hover:shadow-[0_0_20px_rgba(16,185,129,0.10)]',
                    isActive &&
                      'border-emerald-400/30 bg-zinc-900/80 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]',
                  )
                }
                onClick={onClose}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
