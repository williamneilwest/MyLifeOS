import { useMemo } from 'react';
import { useTasksStore } from '../state/useTasksStore';
import type { TasksOverview } from '../types';

export function useTasksData() {
  const tasks = useTasksStore((state) => state.tasks);

  const overview = useMemo<TasksOverview>(() => {
    const today = new Date().toISOString().slice(0, 10);

    return {
      inbox: tasks.filter((task) => task.status !== 'done').length,
      today: tasks.filter((task) => task.dueDate === today && task.status !== 'done').length,
      overdue: tasks.filter((task) => task.dueDate < today && task.status !== 'done').length,
      done: tasks.filter((task) => task.status === 'done').length,
    };
  }, [tasks]);

  return {
    tasks,
    overview,
  };
}
