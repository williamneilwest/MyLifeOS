import { useMemo } from 'react';
import { useFinance } from '../../finance/hooks/useFinance';
import { useHomelab } from '../../homelab/hooks/useHomelab';
import { usePlanning } from '../../planning/hooks/usePlanning';
import { useProjects } from '../../projects/hooks/useProjects';
import { useTasks } from '../../tasks/hooks/useTasks';
import type { DashboardData } from '../types';

export function useDashboardData(): DashboardData {
  const { entries } = useFinance();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const { services: homelab } = useHomelab();
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
