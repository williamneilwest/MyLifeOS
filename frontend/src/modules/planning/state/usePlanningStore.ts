import { create } from 'zustand';
import { createLocalStorageRepository } from '../../../services/storage/localStorageRepository';
import type { PlanningGoal } from '../types';

const defaultGoals: PlanningGoal[] = [
  { id: 'goal-1', title: 'Deploy stable Life OS v1', cadence: 'quarterly', targetDate: '2026-06-30', progress: 55 },
  { id: 'goal-2', title: 'Finish Q2 emergency fund target', cadence: 'monthly', targetDate: '2026-04-30', progress: 42 },
  { id: 'goal-3', title: 'Close top 3 overdue tasks', cadence: 'weekly', targetDate: '2026-03-27', progress: 67 },
];

const repository = createLocalStorageRepository<PlanningGoal[]>('life-os-planning-goals', defaultGoals);

interface PlanningState {
  goals: PlanningGoal[];
  addGoal: (goal: PlanningGoal) => void;
  updateProgress: (id: string, progress: number) => void;
}

export const usePlanningStore = create<PlanningState>((set) => ({
  goals: repository.get(),
  addGoal: (goal) =>
    set((state) => {
      const goals = [goal, ...state.goals];
      repository.save(goals);
      return { goals };
    }),
  updateProgress: (id, progress) =>
    set((state) => {
      const goals = state.goals.map((goal) => (goal.id === id ? { ...goal, progress } : goal));
      repository.save(goals);
      return { goals };
    }),
}));
