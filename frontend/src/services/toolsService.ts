import { apiClient } from './apiClient';
import type { CommandSnippet, ToolLink } from '../modules/tools/types';

export interface ToolsPayload {
  links: ToolLink[];
  snippets: CommandSnippet[];
}

export const toolsService = {
  getAll: () => apiClient.get<ToolsPayload>('/tools/'),
  createLink: (data: ToolLink) => apiClient.post<ToolLink>('/tools/', data),
};
