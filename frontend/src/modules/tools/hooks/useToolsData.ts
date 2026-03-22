import { useTools } from './useTools';

export function useToolsData() {
  const { links, snippets, overview } = useTools();

  return {
    links,
    snippets,
    overview,
  };
}
