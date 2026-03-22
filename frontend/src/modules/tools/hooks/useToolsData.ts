import { useMemo } from 'react';
import { useToolsStore } from '../state/useToolsStore';

export function useToolsData() {
  const links = useToolsStore((state) => state.links);
  const snippets = useToolsStore((state) => state.snippets);

  const overview = useMemo(
    () => ({
      links: links.length,
      snippets: snippets.length,
    }),
    [links.length, snippets.length],
  );

  return {
    links,
    snippets,
    overview,
  };
}
