import { CloudCheck, Menu, MoonStar, PlayCircle, Settings2, SunMedium, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getModuleNavItems } from '../../routes/moduleRegistry';
import { defaultActiveModules, useAppStore } from '../../store/useAppStore';

const PAGE_TITLES: Record<string, string> = {
  '/': 'LifeOS Dashboard',
  '/projects': 'Automation Workflows',
  '/finance': 'Financial Operations',
  '/planning': 'Project Planning',
  '/tasks': 'Task Queue',
  '/tools': 'Tools Library',
  '/homelab': 'Homelab Control',
  '/workplace': 'Workplace Hub',
  '/database': 'Database Manager',
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useAppStore((state) => state.preferences.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const activeModules = useAppStore((state) => state.activeModules);
  const setActiveModules = useAppStore((state) => state.setActiveModules);
  const hideMobileTabs = useAppStore((state) => state.preferences.hideMobileTabs);
  const toggleHideMobileTabs = useAppStore((state) => state.toggleHideMobileTabs);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  const action = useMemo(() => {
    if (location.pathname.startsWith('/tools')) {
      return {
        label: 'Add Tool',
        onClick: () => window.dispatchEvent(new CustomEvent('tools:add-requested')),
      };
    }

    if (location.pathname.startsWith('/workplace') || location.pathname.startsWith('/projects')) {
      return {
        label: 'Refresh / Analyze',
        onClick: () => {
          window.dispatchEvent(new CustomEvent('workspace:refresh-requested'));
          window.dispatchEvent(new CustomEvent('workplace:analyze-tickets'));
          if (!location.pathname.startsWith('/workplace')) navigate('/workplace');
        },
      };
    }

    if (location.pathname.startsWith('/homelab')) {
      return {
        label: 'Restart Services',
        onClick: () => window.dispatchEvent(new CustomEvent('homelab:restart-requested')),
      };
    }

    return {
      label: 'Run Daily Flow',
      onClick: () => navigate('/projects'),
    };
  }, [location.pathname, navigate]);

  const settingsModules = getModuleNavItems(defaultActiveModules);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-black/30 px-3 backdrop-blur-md transition-all duration-200 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60 text-zinc-300 transition-all duration-200 hover:border-emerald-400/30 hover:text-white lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-wide text-zinc-400">{today}</p>
          <h1 className="truncate text-base font-semibold text-white sm:text-lg lg:text-xl">{PAGE_TITLES[location.pathname] ?? 'LifeOS'}</h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="hidden rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs uppercase tracking-wide text-emerald-300 md:inline-flex">
          <CloudCheck className="mr-1 h-3.5 w-3.5" />
          Systems Healthy
        </span>

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60 px-3 text-zinc-300 transition-all duration-200 hover:border-emerald-400/30 hover:text-white"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60 px-3 text-zinc-300 transition-all duration-200 hover:border-emerald-400/30 hover:text-white"
          aria-label="Open settings"
        >
          <Settings2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 text-sm font-medium text-black shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-200 hover:brightness-110 sm:px-4"
        >
          <PlayCircle className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{action.label}</span>
        </button>
      </div>

      {settingsOpen ? (
        <div className="fixed inset-0 z-[60] bg-zinc-950/75" onClick={() => setSettingsOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-zinc-900 p-4 lg:bottom-4 lg:left-auto lg:right-4 lg:top-20 lg:w-[360px] lg:rounded-2xl lg:border"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Settings</p>
              <button
                className="rounded border border-white/10 px-2 py-1 text-xs text-slate-300"
                onClick={() => setSettingsOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
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
                  {settingsModules.map((item) => {
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
                Configure navigation visibility and mobile tab behavior.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
