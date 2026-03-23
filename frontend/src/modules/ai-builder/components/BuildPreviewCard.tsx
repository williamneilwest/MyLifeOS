import { useState } from 'react';
import { Button, Card, Modal } from '../../../components/ui';
import type { AIBuild } from '../../../services/aiBuilderService';
import { StatusBadge } from './StatusBadge';

interface BuildPreviewCardProps {
  build: AIBuild | null;
  loading: boolean;
  onApply: () => void;
  onRevert: () => void;
  onCopyPrompt: () => void;
}

export function BuildPreviewCard({ build, loading, onApply, onRevert, onCopyPrompt }: BuildPreviewCardProps) {
  const [confirmApply, setConfirmApply] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);

  if (!build) {
    return (
      <Card title="Build Preview" description="Generate a plan to preview feature summary, prompt, risk, and rollback strategy.">
        <p className="text-sm text-slate-400">No generated build yet.</p>
      </Card>
    );
  }

  return (
    <>
      <Card title={build.feature_name || 'Generated Build'} description={build.summary}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={build.status} />
            <span className="text-xs text-slate-400">Risk: {build.risk_level}</span>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Estimated Files Affected</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
              {build.files_affected.map((filePath) => (
                <li key={filePath}>{filePath}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Rollback Plan</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{build.rollback_plan}</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">Codex Prompt</p>
              <Button variant="outline" onClick={onCopyPrompt}>Copy Prompt</Button>
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-xs text-slate-200">
              {build.codex_prompt}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setConfirmApply(true)}
              disabled={loading || !(build.status === 'Generated' || build.status === 'Failed' || build.status === 'Reverted')}
            >
              {loading ? 'Applying...' : 'Apply Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmRevert(true)}
              disabled={loading || build.status !== 'Applied'}
            >
              Revert Last Applied Change
            </Button>
          </div>
        </div>
      </Card>

      <Modal title="Confirm Apply" open={confirmApply} onClose={() => setConfirmApply(false)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-200">
            Apply this build now? This will create a git checkpoint, run validations, and commit execution artifacts.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setConfirmApply(false);
                onApply();
              }}
            >
              Confirm Apply
            </Button>
            <Button variant="outline" onClick={() => setConfirmApply(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal title="Confirm Revert" open={confirmRevert} onClose={() => setConfirmRevert(false)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-200">
            Revert the last applied build commit chain for this record?
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setConfirmRevert(false);
                onRevert();
              }}
            >
              Confirm Revert
            </Button>
            <Button variant="outline" onClick={() => setConfirmRevert(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
