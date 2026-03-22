import { NavLink, Outlet } from 'react-router-dom';
import { moduleNavItems } from '../../routes/moduleRegistry';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  const collapsed = useAppStore((state) => state.preferences.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-grid bg-[size:36px_36px] px-4 py-4 text-slate-100 lg:px-6">
      <div className="mx-auto grid max-w-[1700px] gap-4 lg:grid-cols-[auto_1fr] lg:gap-6">
        <Sidebar />
        <main className="min-w-0">
          <TopBar />

          {!collapsed ? (
            <nav className="mb-5 flex gap-2 overflow-x-auto lg:hidden">
              {moduleNavItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'whitespace-nowrap rounded-xl border px-3 py-2 text-xs',
                      isActive ? 'border-cyan-300/40 bg-cyan-400/20 text-cyan-200' : 'border-white/10 bg-white/5 text-slate-300',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}

          <section className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              <Outlet />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
