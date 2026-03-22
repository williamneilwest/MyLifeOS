import type { FinanceEntry } from '../../types';
import type { PlanningGoal } from '../planning/types';
import type { ProjectItem } from '../../types';
import type { TaskItem } from '../tasks/types';
import type { HomelabServiceItem } from '../homelab/types';

export interface DashboardData {
  entries: FinanceEntry[];
  projects: ProjectItem[];
  tasks: TaskItem[];
  homelab: HomelabServiceItem[];
  goals: PlanningGoal[];
}
