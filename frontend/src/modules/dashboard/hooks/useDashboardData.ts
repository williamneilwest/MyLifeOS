import { useMemo } from 'react';
import { useFinanceStore } from '../../finance/state/useFinanceStore';
import { useProjectsStore } from '../../projects/state/useProjectsStore';
import { useTasksStore } from '../../tasks/state/useTasksStore';
import { useHomelabStore } from '../../homelab/state/useHomelabStore';
import { usePlanningStore } from '../../planning/state/usePlanningStore';
import type { DashboardData } from '../types';

export function useDashboardData(): DashboardData {
  const entries = useFinanceStore((state) => state.entries);
  const projects = useProjectsStore((state) => state.projects);
  const tasks = useTasksStore((state) => state.tasks);
  const homelab = useHomelabStore((state) => state.services);
  const goals = usePlanningStore((state) => state.goals);

  return useMemo(
    () => ({
      entries,
      projects,
      tasks,
      homelab,
      goals,
    }),
    [entries, projects, tasks, homelab, goals],
  );
}
