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
