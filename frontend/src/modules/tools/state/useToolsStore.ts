import { create } from 'zustand';
import { createLocalStorageRepository } from '../../../services/storage/localStorageRepository';
import type { CommandSnippet, ToolLink } from '../types';

interface ToolsData {
  links: ToolLink[];
  snippets: CommandSnippet[];
}

const defaults: ToolsData = {
  links: [
    { id: 'tool-1', name: 'GitHub', url: 'https://github.com', category: 'Dev' },
    { id: 'tool-2', name: 'Grafana', url: 'https://grafana.local', category: 'Homelab' },
    { id: 'tool-3', name: 'Bank Portal', url: 'https://example.com', category: 'Finance' },
  ],
  snippets: [
    { id: 'snip-1', title: 'Run Dev Server', command: 'npm run dev' },
    { id: 'snip-2', title: 'Build App', command: 'npm run build' },
    { id: 'snip-3', title: 'Preview Build', command: 'npm run preview' },
  ],
};

const repository = createLocalStorageRepository<ToolsData>('life-os-tools', defaults);

interface ToolsState {
  links: ToolLink[];
  snippets: CommandSnippet[];
  addLink: (link: ToolLink) => void;
}

export const useToolsStore = create<ToolsState>((set) => ({
  links: repository.get().links,
  snippets: repository.get().snippets,
  addLink: (link) =>
    set((state) => {
      const data = {
        links: [link, ...state.links],
        snippets: state.snippets,
      };
      repository.save(data);
      return data;
    }),
}));
