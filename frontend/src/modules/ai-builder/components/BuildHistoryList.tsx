import { Card } from '../../../components/ui';
import type { AIBuild } from '../../../services/aiBuilderService';
import { StatusBadge } from './StatusBadge';

interface BuildHistoryListProps {
  builds: AIBuild[];
  selectedBuildId: string | null;
  onSelect: (build: AIBuild) => void;
}

export function BuildHistoryList({ builds, selectedBuildId, onSelect }: BuildHistoryListProps) {
  return (
    <Card title="Build History" description="Track generated, applied, failed, and reverted builds.">
      <div className="space-y-2">
        {builds.length === 0 ? (
          <p className="text-sm text-slate-400">No builds yet.</p>
        ) : null}
        {builds.map((build) => (
          <button
            key={build.id}
            onClick={() => onSelect(build)}
            className={`w-full rounded-xl border px-3 py-2 text-left transition ${
              selectedBuildId === build.id
                ? 'border-emerald-400/40 bg-emerald-500/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-white">{build.feature_name || 'Untitled Build'}</p>
              <StatusBadge status={build.status} />
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-slate-400">{build.summary || build.idea}</p>
          </button>
        ))}
      </div>
    </Card>
  );
}
