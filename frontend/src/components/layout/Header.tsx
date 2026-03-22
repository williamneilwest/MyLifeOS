import { CloudCheck, MoonStar, PlayCircle, SunMedium } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

const PAGE_TITLES: Record<string, string> = {
  '/': 'LifeOS Dashboard',
  '/projects': 'Automation Workflows',
  '/finance': 'Financial Operations',
  '/planning': 'Project Planning',
  '/tasks': 'Task Queue',
  '/tools': 'Tools Library',
  '/homelab': 'Homelab Control',
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick: _onMenuClick }: HeaderProps) {
  const location = useLocation();
  const theme = useAppStore((state) => state.preferences.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-black/30 px-3 backdrop-blur-md transition-all duration-200 sm:px-4 lg:px-6">
      <div className="min-w-0">
        <p className="truncate text-xs uppercase tracking-wide text-zinc-400">{today}</p>
        <h1 className="truncate text-base font-semibold text-white sm:text-lg lg:text-xl">{PAGE_TITLES[location.pathname] ?? 'LifeOS'}</h1>
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
          className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 text-sm font-medium text-black shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-200 hover:brightness-110 sm:px-4"
        >
          <PlayCircle className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Run Automation</span>
        </button>
      </div>
    </header>
  );
}
