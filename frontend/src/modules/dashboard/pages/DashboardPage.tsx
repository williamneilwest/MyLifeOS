import { Activity, CircleDollarSign, FolderKanban, ListChecks, Server, Target } from 'lucide-react';
import { useEffect } from 'react';
import { Badge, Card, SectionHeader } from '../../../components/ui';
import { useAppStore } from '../../../store/useAppStore';
import { OverviewCard } from '../components/OverviewCard';
import { useDashboardData } from '../hooks/useDashboardData';

function healthVariant(status: 'healthy' | 'degraded' | 'offline') {
  if (status === 'healthy') {
    return 'success' as const;
  }
  if (status === 'degraded') {
    return 'warning' as const;
  }
  return 'neutral' as const;
}

export function DashboardPage() {
  const quickStats = useAppStore((state) => state.quickStats);
  const setQuickStats = useAppStore((state) => state.setQuickStats);
  const { entries, projects, tasks, homelab, goals } = useDashboardData();

  const income = entries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = entries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
  const net = income - expenses;
  const activeProjects = projects.filter((project) => project.status === 'In Progress');
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = tasks.filter((task) => task.dueDate === today && task.status !== 'done');
  const avgGoalProgress = goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0;

  useEffect(() => {
    setQuickStats({
      activeProjects: activeProjects.length,
      pendingTasks: tasks.filter((task) => task.status !== 'done').length,
      homelabUptime: homelab.length ? Number(((homelab.filter((service) => service.status === 'healthy').length / homelab.length) * 100).toFixed(1)) : 0,
    });
  }, [activeProjects.length, homelab, setQuickStats, tasks]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Life OS"
        title="Dashboard"
        description="Cross-module overview with real data from your local persistent stores."
        actions={<Badge variant="info">Operational</Badge>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard title="Net Cashflow" value={`$${net.toLocaleString()}`} helper={`Monthly income ${income.toLocaleString()}`} icon={<CircleDollarSign className="h-4 w-4" />} />
        <OverviewCard title="Active Projects" value={`${activeProjects.length}`} helper={`${quickStats.activeProjects} target active capacity`} icon={<FolderKanban className="h-4 w-4" />} />
        <OverviewCard title="Tasks Due Today" value={`${dueToday.length}`} helper={`${tasks.filter((task) => task.status !== 'done').length} tasks in queue`} icon={<ListChecks className="h-4 w-4" />} />
        <OverviewCard title="Goal Progress" value={`${avgGoalProgress}%`} helper={`${goals.length} planning goals`} icon={<Target className="h-4 w-4" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <h3 className="text-lg font-semibold text-white">Finance Snapshot</h3>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span className="text-slate-400">Income</span>
              <span className="text-white">${income.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span className="text-slate-400">Expenses</span>
              <span className="text-white">${expenses.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span className="text-slate-400">Net Worth</span>
              <span className="text-emerald-300">${quickStats.netWorth.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Project Focus</h3>
          <div className="mt-4 space-y-3">
            {activeProjects.slice(0, 4).map((project) => (
              <div key={project.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-sm font-medium text-white">{project.name}</p>
                <p className="text-xs text-slate-400">Updated: {project.updatedAt.slice(0, 10)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-300" />
            <h3 className="text-lg font-semibold text-white">Today Queue</h3>
          </div>
          <div className="space-y-3">
            {dueToday.length === 0 ? <p className="text-sm text-slate-400">No tasks due today.</p> : null}
            {dueToday.map((task) => (
              <div key={task.id} className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-sm font-medium text-white">{task.title}</p>
                <p className="text-xs text-slate-400">Priority: {task.priority}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-cyan-300" />
            <h3 className="text-lg font-semibold text-white">Homelab Health</h3>
          </div>
          <div className="space-y-3">
            {homelab.map((service) => (
              <div key={service.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-white">{service.name}</p>
                  <p className="text-xs text-slate-400">Uptime {service.uptimeDays}d</p>
                </div>
                <Badge variant={healthVariant(service.status)}>{service.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Upcoming Goals</h3>
          <div className="mt-4 space-y-3">
            {goals.slice(0, 6).map((goal) => (
              <div key={goal.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{goal.title}</p>
                    <p className="text-xs text-slate-400">Target {goal.targetDate}</p>
                  </div>
                  <Badge variant="info">{goal.progress}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
