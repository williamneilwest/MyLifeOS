import { create } from 'zustand';
import { createLocalStorageRepository } from '../../../services/storage/localStorageRepository';
import type { TaskItem, TaskStatus } from '../types';

const defaultTasks: TaskItem[] = [
  { id: 'task-1', title: 'Review March budget', dueDate: '2026-03-24', priority: 'high', status: 'todo' },
  { id: 'task-2', title: 'Finish homelab backups', dueDate: '2026-03-25', priority: 'medium', status: 'in-progress' },
  { id: 'task-3', title: 'Update project roadmap', dueDate: '2026-03-21', priority: 'high', status: 'todo' },
  { id: 'task-4', title: 'Inbox zero for work queue', dueDate: '2026-03-20', priority: 'low', status: 'done' },
];

const repository = createLocalStorageRepository<TaskItem[]>('life-os-tasks', defaultTasks);

interface TasksState {
  tasks: TaskItem[];
  addTask: (task: TaskItem) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
}

export const useTasksStore = create<TasksState>((set) => ({
  tasks: repository.get(),
  addTask: (task) =>
    set((state) => {
      const tasks = [task, ...state.tasks];
      repository.save(tasks);
      return { tasks };
    }),
  updateTaskStatus: (id, status) =>
    set((state) => {
      const tasks = state.tasks.map((task) => (task.id === id ? { ...task, status } : task));
      repository.save(tasks);
      return { tasks };
    }),
}));
