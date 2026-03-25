import { Activity, CircleDollarSign, FolderKanban, ListChecks, Server, TerminalSquare, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CommandCenter } from '../modules/dashboard/components/CommandCenter';
import { FeaturedCards } from '../modules/dashboard/components/FeaturedCards';
import { FinancePanel } from '../modules/dashboard/components/FinancePanel';
import { ProjectGrid } from '../modules/dashboard/components/ProjectGrid';
import { QuickActions } from '../modules/dashboard/components/QuickActions';
import { Recommendation, RecommendationsPanel } from '../modules/dashboard/components/RecommendationsPanel';
import { RightSidebar } from '../modules/dashboard/components/RightSidebar';
import { AIProjectGenerator } from '../modules/dashboard/components/AIProjectGenerator';
import { useFinance } from '../modules/finance/hooks/useFinance';
import { usePlanning } from '../modules/planning/hooks/usePlanning';
import { useProjects } from '../modules/projects/hooks/useProjects';
import { useTasks } from '../modules/tasks/hooks/useTasks';
import { getDashboardSummary } from '../services/api';

type DashboardMode = 'overview' | 'workspace' | 'homelab' | 'tools';

const MODE_TABS: Array<{ id: DashboardMode; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'homelab', label: 'Homelab' },
  { id: 'tools', label: 'Tools' },
];

const HOMELAB_SERVICES = [
  { id: 'portainer', name: 'Portainer', status: 'online', url: '/homelab' },
  { id: 'grafana', name: 'Grafana', status: 'online', url: '/homelab' },
  { id: 'pihole', name: 'Pi-hole', status: 'offline', url: '/homelab' },
  { id: 'proxmox', name: 'Proxmox', status: 'online', url: '/homelab' },
];

function toGridStatus(status: string): 'running' | 'idle' | 'blocked' {
  if (status === 'In Progress') {
    return 'running';
  }

  if (status === 'Blocked') {
    return 'blocked';
  }

  return 'idle';
}

export function Dashboard() {
  const navigate = useNavigate();
  const [focusMode, setFocusMode] = useState(false);
  const [mode, setMode] = useState<DashboardMode>('overview');

  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks();
  const { income, expense, savings, loading: financeLoading, error: financeError } = useFinance();
  const { goals, loading: planningLoading, error: planningError } = usePlanning();
  const {
    data: dashboardSummary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    refetchInterval: 10_000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const activeTasks = dashboardSummary?.pending_tasks ?? tasks.filter((task) => task.status !== 'done').length;
  const blockers = projects.filter((project) => project.status === 'Blocked').length;
  const overdue = tasks.filter((task) => task.dueDate < today && task.status !== 'done').length;
  const totalProjects = dashboardSummary?.total_projects ?? projects.length;
  const planningCount = dashboardSummary?.planning_count ?? goals.length;
  const totalBalance = dashboardSummary?.total_balance ?? (income - expense - savings);

  const commandStats = {
    tasks: activeTasks,
    blockers,
    urgent: tasks.filter((task) => task.priority === 'high' && task.status !== 'done').length,
    pending: activeTasks,
    financialFlow: totalBalance >= 0 ? 'strong' : 'watch',
  };

  const recommendations = useMemo<Recommendation[]>(
    () => [
      {
        id: 'r1',
        title: `${overdue} overdue tasks need triage`,
        detail: 'Clear overdue project reviews to prevent release delays this evening.',
        severity: overdue > 0 ? 'high' : 'low',
        actionLabel: 'Open Task Queue',
        onAction: () => navigate('/tasks'),
      },
      {
        id: 'r2',
        title: totalBalance < 0 ? 'Cashflow is negative' : 'Cashflow is healthy',
        detail: 'Review finance entries and rebalance income, expenses, and savings as needed.',
        severity: totalBalance < 0 ? 'high' : 'low',
        actionLabel: 'Review Finance',
        onAction: () => navigate('/finance'),
      },
      {
        id: 'r3',
        title: blockers > 0 ? 'Project blockers need attention' : 'Projects moving cleanly',
        detail: 'Inspect blocked items and resolve dependencies to protect delivery pace.',
        severity: blockers > 0 ? 'high' : 'low',
        actionLabel: 'Open Projects',
        onAction: () => navigate('/projects'),
      },
      {
        id: 'r4',
        title: planningCount > 0 ? 'Planning check-in' : 'No planning items yet',
        detail: planningCount > 0 ? 'Review goal progress and update target milestones for this week.' : 'Create planning items to track future milestones.',
        severity: planningCount > 0 ? 'low' : 'medium',
        actionLabel: 'Open Planning',
        onAction: () => navigate('/planning'),
      },
    ],
    [navigate, overdue, totalBalance, blockers, planningCount],
  );

  const filteredRecommendations = focusMode ? recommendations.filter((item) => item.severity !== 'low') : recommendations;

  const orderedProjects = [...projects].sort((a, b) => {
    const aScore = a.status === 'In Progress' ? 3 : a.status === 'Blocked' ? 2 : 1;
    const bScore = b.status === 'In Progress' ? 3 : b.status === 'Blocked' ? 2 : 1;
    return bScore - aScore;
  });

  const primaryProject = orderedProjects[0];
  const secondaryProjects = orderedProjects.slice(1, 3);
  const dashboardError = [projectsError, tasksError, financeError, planningError, summaryError instanceof Error ? summaryError.message : null].find(Boolean);
  const isLoadingDashboard = projectsLoading || tasksLoading || financeLoading || planningLoading || summaryLoading;

  return (
    <div className="space-y-4 overflow-x-hidden md:space-y-6">
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-full gap-2 sm:min-w-0">
          {MODE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`rounded-full border px-3 py-2 text-xs transition-all ${
                mode === tab.id
                  ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.2)]'
                  : 'border-white/10 bg-zinc-900/40 text-slate-300 hover:border-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoadingDashboard ? <p className="text-sm text-slate-400">Loading dashboard data...</p> : null}
      {dashboardError ? <p className="text-sm text-rose-300">Dashboard data partially unavailable: {dashboardError}</p> : null}

      {mode === 'overview' ? (
        <>
          <CommandCenter
            userName="Will"
            stats={commandStats}
            focusMode={focusMode}
            onRunMyDay={() => navigate('/projects')}
            onToggleFocusMode={() => setFocusMode((prev) => !prev)}
            onSyncAllData={() => navigate('/tools')}
          />

          <AIProjectGenerator />

          <RecommendationsPanel items={filteredRecommendations} />

          <QuickActions
            actions={[
              { id: 'qa1', label: 'Run Daily Sync', icon: Activity, onClick: () => navigate('/projects') },
              { id: 'qa2', label: 'Log Progress', icon: ListChecks, onClick: () => navigate('/tasks') },
              { id: 'qa3', label: 'Capture Expense', icon: CircleDollarSign, onClick: () => navigate('/finance') },
              { id: 'qa4', label: 'Open Projects', icon: FolderKanban, onClick: () => navigate('/projects') },
              { id: 'qa5', label: 'Execute Script', icon: TerminalSquare, onClick: () => navigate('/tools') },
            ]}
            onConfigure={() => navigate('/tools')}
          />

          <div className="lg:hidden">
            <RightSidebar mode="focus-only" onStartFocus={() => setFocusMode(true)} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4 md:space-y-6">
              <FeaturedCards
                items={[
                  {
                    id: 'f1',
                    title: 'Daily Orchestration',
                    description: 'Morning workflow bundle and task sync pipeline.',
                    progress: activeTasks > 0 ? Math.max(30, 100 - activeTasks * 5) : 90,
                    status: blockers > 0 ? 'idle' : 'running',
                    metric: `${activeTasks} active tasks / ${totalProjects} projects`,
                    onOpen: () => navigate('/projects'),
                  },
                  {
                    id: 'f2',
                    title: 'Financial Control Loop',
                    description: 'Budgeting, transaction reconciliation, and allocation checks.',
                    progress: income > 0 ? Math.max(20, Math.min(95, Math.round((1 - expense / income) * 100))) : 50,
                    status: 'idle',
                    metric: `${planningCount} tracked goals`,
                    onOpen: () => navigate('/finance'),
                  },
                ]}
              />

              {primaryProject && (
                <ProjectGrid
                  primary={{
                    id: primaryProject.id,
                    name: primaryProject.name,
                    status: toGridStatus(primaryProject.status),
                    summary: primaryProject.notes,
                    keyTasks: tasks.slice(0, 3).map((task) => task.title),
                    onOpen: () => navigate('/projects'),
                  }}
                  secondary={secondaryProjects.map((project) => ({
                    id: project.id,
                    name: project.name,
                    status: toGridStatus(project.status),
                    summary: project.notes,
                    keyTasks: [],
                    onOpen: () => navigate('/projects'),
                  }))}
                />
              )}

              <FinancePanel
                metrics={[
                  {
                    id: 'm1',
                    label: 'Cashflow',
                    value: `$${totalBalance.toLocaleString()}`,
                    delta: totalBalance >= 0 ? 'Positive this cycle' : 'Negative this cycle',
                    trend: totalBalance >= 0 ? 'up' : 'down',
                  },
                  {
                    id: 'm2',
                    label: 'Savings',
                    value: `$${savings.toLocaleString()}`,
                    delta: 'Current tracked total',
                    trend: 'up',
                  },
                  {
                    id: 'm3',
                    label: 'Variable Spend',
                    value: `$${expense.toLocaleString()}`,
                    delta: 'Current tracked total',
                    trend: 'down',
                  },
                ]}
                onOpenFinance={() => navigate('/finance')}
              />
            </div>

            <div className="hidden lg:block">
              <RightSidebar onStartFocus={() => setFocusMode(true)} />
            </div>
          </div>

          <div className="space-y-4 md:space-y-6 lg:hidden">
            <RightSidebar mode="mobile-secondary" onStartFocus={() => setFocusMode(true)} />
          </div>
        </>
      ) : null}

      {mode === 'workspace' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate('/workplace')}
            className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-cyan-300/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          >
            <p className="text-xs uppercase tracking-wide text-cyan-200">Workspace</p>
            <p className="mt-1 text-lg font-semibold text-white">Ticket Operations</p>
            <p className="mt-2 text-sm text-slate-300">Open the focused ticket dashboard with quick links and AI analysis actions.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-cyan-300/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          >
            <p className="text-xs uppercase tracking-wide text-cyan-200">Tasks</p>
            <p className="mt-1 text-lg font-semibold text-white">Execution Queue</p>
            <p className="mt-2 text-sm text-slate-300">Review active tasks, prioritize blockers, and clear overdue work quickly.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-cyan-300/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          >
            <p className="text-xs uppercase tracking-wide text-cyan-200">Projects</p>
            <p className="mt-1 text-lg font-semibold text-white">Delivery Board</p>
            <p className="mt-2 text-sm text-slate-300">Track milestones, unblock stalled workstreams, and update status in one place.</p>
          </button>
        </div>
      ) : null}

      {mode === 'homelab' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {HOMELAB_SERVICES.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => navigate(service.url)}
              className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-emerald-300/30 hover:shadow-[0_0_22px_rgba(16,185,129,0.14)]"
            >
              <div className="inline-flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-300" />
                <p className="text-base font-semibold text-white">{service.name}</p>
              </div>
              <p className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] uppercase tracking-wide ${service.status === 'online' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
                {service.status}
              </p>
              <p className="mt-3 text-sm text-slate-300">Open service controls and run quick homelab actions.</p>
            </button>
          ))}
        </div>
      ) : null}

      {mode === 'tools' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate('/tools')}
            className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-cyan-300/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          >
            <div className="inline-flex items-center gap-2">
              <Wrench className="h-4 w-4 text-cyan-300" />
              <p className="text-base font-semibold text-white">Tool Modules</p>
            </div>
            <p className="mt-3 text-sm text-slate-300">Open utility modules sorted by usage and add new tools.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/tools')}
            className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-cyan-300/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          >
            <div className="inline-flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-300" />
              <p className="text-base font-semibold text-white">API / Dev Tools</p>
            </div>
            <p className="mt-3 text-sm text-slate-300">Jump to API modules for endpoint checks and quick operational calls.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/tools')}
            className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-cyan-300/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          >
            <div className="inline-flex items-center gap-2">
              <TerminalSquare className="h-4 w-4 text-cyan-300" />
              <p className="text-base font-semibold text-white">Quick Actions</p>
            </div>
            <p className="mt-3 text-sm text-slate-300">Run shortcuts and automation actions from one mobile-friendly panel.</p>
          </button>
        </div>
      ) : null}
    </div>
  );
}
