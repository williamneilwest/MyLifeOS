import { useMemo } from 'react';
import { usePlanningStore } from '../state/usePlanningStore';
import type { PlanningOverview } from '../types';

export function usePlanningData() {
  const goals = usePlanningStore((state) => state.goals);

  const overview = useMemo<PlanningOverview>(() => {
    const safeGoalsCount = goals.length || 1;

    return {
      weeklyGoals: goals.filter((goal) => goal.cadence === 'weekly').length,
      monthlyGoals: goals.filter((goal) => goal.cadence === 'monthly').length,
      quarterlyGoals: goals.filter((goal) => goal.cadence === 'quarterly').length,
      averageProgress: Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / safeGoalsCount),
    };
  }, [goals]);

  return {
    goals,
    overview,
  };
}
