import { Activity, CircleDollarSign, FolderKanban, ListChecks, TerminalSquare } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandCenter } from '../modules/dashboard/components/CommandCenter';
import { FeaturedCards } from '../modules/dashboard/components/FeaturedCards';
import { FinancePanel } from '../modules/dashboard/components/FinancePanel';
import { ProjectGrid } from '../modules/dashboard/components/ProjectGrid';
import { QuickActions } from '../modules/dashboard/components/QuickActions';
import { Recommendation, RecommendationsPanel } from '../modules/dashboard/components/RecommendationsPanel';
import { RightSidebar } from '../modules/dashboard/components/RightSidebar';

export function Dashboard() {
  const navigate = useNavigate();
  const [focusMode, setFocusMode] = useState(false);

  const commandStats = {
    tasks: 6,
    blockers: 2,
    urgent: 3,
    pending: 11,
    financialFlow: 'strong',
  };

  const recommendations = useMemo<Recommendation[]>(
    () => [
      {
        id: 'r1',
        title: '2 overdue tasks need triage',
        detail: 'Clear overdue project reviews to prevent release delays this evening.',
        severity: 'high',
        actionLabel: 'Open Task Queue',
        onAction: () => navigate('/tasks'),
      },
      {
        id: 'r2',
        title: 'Spending anomaly detected',
        detail: 'Dining spend is 18% above your weekly average. Review and categorize.',
        severity: 'medium',
        actionLabel: 'Review Finance',
        onAction: () => navigate('/finance'),
      },
      {
        id: 'r3',
        title: 'Project risk: dependency lag',
        detail: 'Main automation flow has one blocked dependency update pending approval.',
        severity: 'high',
        actionLabel: 'Resolve Blocker',
        onAction: () => navigate('/projects'),
      },
      {
        id: 'r4',
        title: 'Home goal is on-track',
        detail: 'You are pacing 4% above monthly target. Consider one extra transfer this week.',
        severity: 'low',
        actionLabel: 'Open Planning',
        onAction: () => navigate('/planning'),
      },
    ],
    [navigate],
  );

  const filteredRecommendations = focusMode ? recommendations.filter((item) => item.severity !== 'low') : recommendations;

  return (
    <div className="space-y-4 md:space-y-6">
      <CommandCenter
        userName="Will"
        stats={commandStats}
        focusMode={focusMode}
        onRunMyDay={() => navigate('/projects')}
        onToggleFocusMode={() => setFocusMode((prev) => !prev)}
        onSyncAllData={() => navigate('/tools')}
      />

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
                progress: 78,
                status: 'running',
                metric: '5 workflows active',
                onOpen: () => navigate('/projects'),
              },
              {
                id: 'f2',
                title: 'Financial Control Loop',
                description: 'Budgeting, transaction reconciliation, and allocation checks.',
                progress: 64,
                status: 'idle',
                metric: '12 checks completed',
                onOpen: () => navigate('/finance'),
              },
            ]}
          />

          <ProjectGrid
            primary={{
              id: 'p1',
              name: 'LifeOS Automation Core',
              status: 'running',
              summary: 'Integrating task intelligence and finance signals into one execution path.',
              keyTasks: ['Finalize blocker resolution flow', 'Ship dashboard recommendation actions', 'Review nightly sync logs'],
              onOpen: () => navigate('/projects'),
            }}
            secondary={[
              {
                id: 'p2',
                name: 'Finance Reporting',
                status: 'idle',
                summary: 'Weekly trend cards and category variance alerts.',
                keyTasks: [],
                onOpen: () => navigate('/finance'),
              },
              {
                id: 'p3',
                name: 'Homelab Reliability',
                status: 'blocked',
                summary: 'Dependency patching before next maintenance window.',
                keyTasks: [],
                onOpen: () => navigate('/homelab'),
              },
            ]}
          />

          <FinancePanel
            metrics={[
              { id: 'm1', label: 'Cashflow', value: '+$1,240', delta: '+8.2% week-over-week', trend: 'up' },
              { id: 'm2', label: 'Savings Rate', value: '26.4%', delta: '+2.1% vs last week', trend: 'up' },
              { id: 'm3', label: 'Variable Spend', value: '$612', delta: '-4.6% vs last week', trend: 'down' },
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
