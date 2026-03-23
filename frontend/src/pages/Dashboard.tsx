import { Activity, CircleDollarSign, FolderKanban, ListChecks, TerminalSquare } from 'lucide-react';
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
  const urgent = tasks.filter((task) => task.priority === 'high' && task.status !== 'done').length;
  const overdue = tasks.filter((task) => task.dueDate < today && task.status !== 'done').length;
  const totalProjects = dashboardSummary?.total_projects ?? projects.length;
  const planningCount = dashboardSummary?.planning_count ?? goals.length;
  const totalBalance = dashboardSummary?.total_balance ?? (income - expense - savings);

  const commandStats = {
    tasks: activeTasks,
    blockers,
    urgent,
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
    <div className="space-y-4 md:space-y-6">
      {isLoadingDashboard ? <p className="text-sm text-slate-400">Loading dashboard data...</p> : null}
      {dashboardError ? <p className="text-sm text-rose-300">Dashboard data partially unavailable: {dashboardError}</p> : null}

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] md:gap-6">
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

      <div className="space-y-4 lg:hidden md:space-y-6">
        <RightSidebar mode="mobile-secondary" onStartFocus={() => setFocusMode(true)} />
      </div>
    </div>
  );
}
