import { apiClient } from './apiClient';
import type { FinanceEntry, PlanningItem, Project, Task } from '../types';

interface ListResponse<T> {
  data: T[];
  lastUpdated: string;
}

export function getProjects() {
  return apiClient.get<ListResponse<Project>>('/projects/');
}

export function createProject(project: Project) {
  return apiClient.post<Project>('/projects/', project);
}

export function updateProject(projectId: string, updates: Partial<Project>) {
  return apiClient.patch<Project>(`/projects/${projectId}`, updates);
}

// /services/api.ts
export async function getTasks() {
  const res = await fetch('/api/tasks/');
  if (!res.ok) {
    throw new Error('API request failed');
  }
  const json = await res.json() as { data: ListResponse<Task> };
  return json.data;
}

export function createTask(task: Task) {
  return apiClient.post<Task>('/tasks/', task);
}

export function updateTask(taskId: string, updates: Partial<Task>) {
  return apiClient.patch<Task>(`/tasks/${taskId}`, updates);
}

export function getPlanning() {
  return apiClient.get<ListResponse<PlanningItem>>('/planning/');
}

export function createPlanning(item: PlanningItem) {
  return apiClient.post<PlanningItem>('/planning/', item);
}

export function updatePlanning(itemId: string, updates: Partial<PlanningItem>) {
  return apiClient.patch<PlanningItem>(`/planning/${itemId}`, updates);
}

export function getFinance() {
  return apiClient.get<ListResponse<FinanceEntry>>('/finance/');
}

export interface DashboardSummary {
  total_tasks: number;
  pending_tasks: number;
  total_projects: number;
  total_balance: number;
  planning_count: number;
}

export interface AiProjectResult {
  project: Project;
  tasks: Task[];
  ai: {
    difficulty: 'Easy' | 'Medium' | 'Hard';
    estimated_time: string;
  };
}

export function createProjectFromIdea(idea: string, generateTasks: boolean) {
  return fetch('/api/ai/create-project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea, generateTasks }),
  }).then(async (res) => {
    const json = await res.json().catch(() => null) as { data?: AiProjectResult; error?: string } | null;
    if (!res.ok) {
      throw new Error(json?.error || `AI project generation failed (${res.status})`);
    }
    if (!json?.data) {
      throw new Error('AI project generation returned an invalid response');
    }
    return json.data;
  });
}

export function getDashboardSummary() {
  return apiClient.get<DashboardSummary>('/dashboard-summary');
}

export function getDatabaseTables() {
  return fetch('/api/db/tables')
    .then((res) => {
      if (!res.ok) {
        throw new Error('API request failed');
      }
      return res.json();
    })
    .then((json: { data: string[] }) => {
      console.log('DB TABLES RESPONSE:', json);
      return json.data;
    });
}

export function getDatabaseTableData(tableName: string) {
  console.log('Fetching table data...');
  return apiClient.get<Record<string, unknown>[]>(`/db/table/${encodeURIComponent(tableName)}`);
}
