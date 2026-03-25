export interface ToolLink {
  id: string;
  name: string;
  url: string;
  category: string;
}

export interface CommandSnippet {
  id: string;
  title: string;
  command: string;
}

export interface ToolsOverview {
  links: number;
  snippets: number;
}

export type ToolModuleType = 'services' | 'qr' | 'shortcut';

export interface ToolModule {
  id: string;
  user_id: string;
  name: string;
  type: ToolModuleType;
  config: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}
