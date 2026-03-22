export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
}

export interface TasksOverview {
  inbox: number;
  today: number;
  overdue: number;
  done: number;
}
