import { useMemo } from 'react';
import type { ProjectsSummary } from '../types';

export function useProjectsData(): ProjectsSummary {
  return useMemo(
    () => ({
      total: 12,
      active: 4,
      blocked: 1,
    }),
    [],
  );
}
