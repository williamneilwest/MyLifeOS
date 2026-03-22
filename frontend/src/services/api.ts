import { apiClient } from './apiClient';
import type { PlanningItem, Project, Task } from '../types';

interface ListResponse<T> {
  data: T[];
  lastUpdated: string;
}

export function getProjects() {
  return apiClient.get<ListResponse<Project>>('/api/projects/');
}

export function createProject(project: Project) {
  return apiClient.post<Project>('/api/projects/', project);
}

export function updateProject(projectId: string, updates: Partial<Project>) {
  return apiClient.patch<Project>(`/api/projects/${projectId}`, updates);
}

export function getTasks() {
  return apiClient.get<ListResponse<Task>>('/api/tasks/');
}

export function createTask(task: Task) {
  return apiClient.post<Task>('/api/tasks/', task);
}

export function updateTask(taskId: string, updates: Partial<Task>) {
  return apiClient.patch<Task>(`/api/tasks/${taskId}`, updates);
}

export function getPlanning() {
  return apiClient.get<ListResponse<PlanningItem>>('/api/planning/');
}

export function createPlanning(item: PlanningItem) {
  return apiClient.post<PlanningItem>('/api/planning/', item);
}

export function updatePlanning(itemId: string, updates: Partial<PlanningItem>) {
  return apiClient.patch<PlanningItem>(`/api/planning/${itemId}`, updates);
}

export function getDatabaseTables() {
  console.log('Fetching tables...');
  return apiClient.get<string[]>('/api/db/tables');
}

export function getDatabaseTableData(tableName: string) {
  console.log('Fetching table data...');
  return apiClient.get<Record<string, unknown>[]>(`/api/db/table/${encodeURIComponent(tableName)}`);
}
