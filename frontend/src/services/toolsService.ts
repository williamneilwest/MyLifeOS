import { apiClient } from './apiClient';
import type { CommandSnippet, ToolLink, ToolModule } from '../modules/tools/types';

export interface ToolsPayload {
  links: ToolLink[];
  snippets: CommandSnippet[];
}

interface ToolModulesPayload {
  modules: ToolModule[];
}

export const toolsService = {
  getAll: () => apiClient.get<ToolsPayload>('/tools/'),
  createLink: (data: ToolLink) => apiClient.post<ToolLink>('/tools/', data),
  getModules: () => apiClient.get<ToolModulesPayload>('/tools/modules'),
  createModule: (payload: { name: string; type: string; config?: Record<string, unknown> }) =>
    apiClient.post<ToolModule>('/tools/modules', payload),
  updateModule: (id: string, payload: { name?: string; type?: string; config?: Record<string, unknown> }) =>
    apiClient.put<ToolModule>(`/tools/modules/${id}`, payload),
  deleteModule: (id: string) => apiClient.delete(`/tools/modules/${id}`),
};
