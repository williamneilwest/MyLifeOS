export type GoalCadence = 'weekly' | 'monthly' | 'quarterly';

export interface PlanningGoal {
  id: string;
  title: string;
  cadence: GoalCadence;
  targetDate: string;
  progress: number;
}

export interface PlanningOverview {
  weeklyGoals: number;
  monthlyGoals: number;
  quarterlyGoals: number;
  averageProgress: number;
}
