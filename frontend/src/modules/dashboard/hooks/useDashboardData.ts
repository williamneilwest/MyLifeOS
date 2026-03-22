import { useMemo } from 'react';
import { useFinance } from '../../finance/hooks/useFinance';
import { usePlanning } from '../../planning/hooks/usePlanning';
import { useProjects } from '../../projects/hooks/useProjects';
import { useTasks } from '../../tasks/hooks/useTasks';
import { useHomelabStore } from '../../homelab/state/useHomelabStore';
import type { DashboardData } from '../types';

export function useDashboardData(): DashboardData {
  const { entries } = useFinance();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const homelab = useHomelabStore((state) => state.services);
  const { goals } = usePlanning();

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
