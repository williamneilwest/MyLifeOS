export interface FinancialSummary {
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  investmentBalance: number;
}

export interface ProjectSnapshot {
  id: string;
  name: string;
  status: 'active' | 'on-hold' | 'blocked' | 'done';
  owner: string;
}

export interface TaskSnapshot {
  total: number;
  dueToday: number;
  overdue: number;
  completedThisWeek: number;
}

export interface HomelabService {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'offline';
  uptime: string;
}

export interface UpcomingItem {
  id: string;
  title: string;
  when: string;
  type: 'goal' | 'event';
}

export interface DashboardOverview {
  financial: FinancialSummary;
  projects: ProjectSnapshot[];
  tasks: TaskSnapshot;
  homelab: HomelabService[];
  upcoming: UpcomingItem[];
}

const dashboardOverview: DashboardOverview = {
  financial: {
    monthlyIncome: 10950,
    monthlyExpenses: 6820,
    savingsRate: 37,
    investmentBalance: 248500,
  },
  projects: [
    { id: 'p1', name: 'Life OS v2', status: 'active', owner: 'You' },
    { id: 'p2', name: 'Garage Gym Build', status: 'on-hold', owner: 'You' },
    { id: 'p3', name: 'Family Travel Planner', status: 'blocked', owner: 'You' },
  ],
  tasks: {
    total: 28,
    dueToday: 4,
    overdue: 2,
    completedThisWeek: 16,
  },
  homelab: [
    { id: 'h1', name: 'NAS', status: 'healthy', uptime: '42d' },
    { id: 'h2', name: 'Plex', status: 'degraded', uptime: '8d' },
    { id: 'h3', name: 'Traefik', status: 'healthy', uptime: '77d' },
    { id: 'h4', name: 'CI Runner', status: 'offline', uptime: '0d' },
  ],
  upcoming: [
    { id: 'u1', title: 'Quarterly net-worth review', when: 'Tue, Mar 24', type: 'goal' },
    { id: 'u2', title: 'Deploy homelab monitoring revamp', when: 'Thu, Mar 26', type: 'event' },
    { id: 'u3', title: 'Project planning sprint', when: 'Mon, Mar 30', type: 'goal' },
  ],
};

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  return Promise.resolve(dashboardOverview);
}

export async function fetchFinanceSummary(): Promise<FinancialSummary> {
  return Promise.resolve(dashboardOverview.financial);
}

export async function fetchProjects(): Promise<ProjectSnapshot[]> {
  return Promise.resolve(dashboardOverview.projects);
}

export async function fetchHomelabServices(): Promise<HomelabService[]> {
  return Promise.resolve(dashboardOverview.homelab);
}

export async function fetchUpcomingItems(): Promise<UpcomingItem[]> {
  return Promise.resolve(dashboardOverview.upcoming);
}
