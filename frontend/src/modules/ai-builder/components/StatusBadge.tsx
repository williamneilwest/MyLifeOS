import { Badge } from '../../../components/ui';
import type { BuildStatus } from '../../../services/aiBuilderService';

interface StatusBadgeProps {
  status: BuildStatus;
}

const variantByStatus: Record<BuildStatus, 'neutral' | 'success' | 'warning' | 'info'> = {
  Draft: 'neutral',
  Generated: 'info',
  Applying: 'warning',
  Applied: 'success',
  Failed: 'warning',
  Reverted: 'neutral',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={variantByStatus[status]}>{status}</Badge>;
}
