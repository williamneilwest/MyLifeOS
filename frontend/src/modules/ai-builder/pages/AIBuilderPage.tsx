import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, SectionHeader } from '../../../components/ui';
import { aiBuilderService, type AIBuild } from '../../../services/aiBuilderService';
import { BuildHistoryList } from '../components/BuildHistoryList';
import { BuildPreviewCard } from '../components/BuildPreviewCard';
import { IdeaInputPanel } from '../components/IdeaInputPanel';

export function AIBuilderPage() {
  const queryClient = useQueryClient();
  const [idea, setIdea] = useState('');
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [applyOutput, setApplyOutput] = useState<string | null>(null);

  const { data: buildsPayload, isLoading: loadingBuilds, error: buildsError } = useQuery({
    queryKey: ['ai-builder-builds'],
    queryFn: aiBuilderService.list,
  });

  const { data: statusPayload } = useQuery({
    queryKey: ['ai-builder-status'],
    queryFn: aiBuilderService.status,
  });

  const generateMutation = useMutation({
    mutationFn: () => aiBuilderService.generate(idea.trim()),
    onSuccess: async (payload) => {
      const build = payload?.build || {
        codexPrompt: '',
        risk: 'unknown',
        filesAffected: [],
        rollbackPlan: '',
      };
      setNotice(payload?.success ? 'Build plan generated.' : 'AI generation failed. Using fallback build payload.');
      setIdea('');
      setSelectedBuildId(build.id || null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ai-builder-builds'] }),
        queryClient.invalidateQueries({ queryKey: ['ai-builder-status'] }),
      ]);
    },
  });

  const applyMutation = useMutation({
    mutationFn: (build: AIBuild) =>
      aiBuilderService.applyRuntime({
        codexPrompt: build.codex_prompt,
        filesAffected: build.files_affected,
        rollbackPlan: build.rollback_plan,
      }),
    onSuccess: async (payload) => {
      setNotice(payload.message || 'Build applied.');
      const output = payload.commandResults
        .map((item) => [`$ ${item.command}`, item.stdout, item.stderr].filter(Boolean).join('\n'))
        .join('\n\n');
      setApplyOutput(output || 'No command output.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ai-builder-builds'] }),
        queryClient.invalidateQueries({ queryKey: ['ai-builder-status'] }),
      ]);
    },
  });

  const revertMutation = useMutation({
    mutationFn: (buildId: string) => aiBuilderService.revert(buildId),
    onSuccess: async (payload) => {
      const build = payload?.build || {
        codexPrompt: '',
        risk: 'unknown',
        filesAffected: [],
        rollbackPlan: '',
      };
      setNotice(`Build reverted: ${(build as { feature_name?: string }).feature_name || 'Unknown build'}`);
      setSelectedBuildId((build as { id?: string }).id || selectedBuildId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ai-builder-builds'] }),
        queryClient.invalidateQueries({ queryKey: ['ai-builder-status'] }),
      ]);
    },
  });

  const builds = buildsPayload?.builds || [];
  const selectedBuild = useMemo(() => {
    if (!builds.length) {
      return null;
    }
    if (selectedBuildId) {
      return builds.find((build) => build.id === selectedBuildId) || builds[0];
    }
    return builds[0];
  }, [builds, selectedBuildId]);

  const activeError = generateMutation.error || applyMutation.error || revertMutation.error || buildsError;
  const errorMessage = activeError instanceof Error ? activeError.message : null;
  const busy = generateMutation.isPending || applyMutation.isPending || revertMutation.isPending;

  const copyPrompt = async (build: AIBuild | null) => {
    if (!build) return;
    await navigator.clipboard.writeText(build.codex_prompt);
    setNotice('Prompt copied to clipboard.');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module"
        title="AI Builder"
        description="Idea → Build → Apply → Revert workflow with history and git-backed safety."
        actions={<Badge variant="info">Persistent</Badge>}
      />

      {notice ? <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p> : null}
      {errorMessage ? <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{errorMessage}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <IdeaInputPanel
            idea={idea}
            loading={generateMutation.isPending}
            onIdeaChange={setIdea}
            onGenerate={() => generateMutation.mutate()}
          />
          <BuildPreviewCard
            build={selectedBuild || null}
            loading={busy}
            onApply={() => {
              if (!selectedBuild) return;
              applyMutation.mutate(selectedBuild);
            }}
            onRevert={() => {
              if (!selectedBuild) return;
              revertMutation.mutate(selectedBuild.id);
            }}
            onCopyPrompt={() => {
              void copyPrompt(selectedBuild || null);
            }}
          />
          {applyOutput ? (
            <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Apply Output</p>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-zinc-950/70 p-3 text-xs text-slate-200">
                {applyOutput}
              </pre>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <BuildHistoryList
            builds={builds}
            selectedBuildId={selectedBuild?.id || null}
            onSelect={(build) => setSelectedBuildId(build.id)}
          />

          <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Builder Status</p>
            <p className="mt-2 text-sm text-slate-200">Branch: {statusPayload?.git.branch || 'unknown'}</p>
            <p className="text-sm text-slate-200">Commit: {statusPayload?.git.commit || 'unknown'}</p>
            <p className="text-sm text-slate-200">Working tree dirty: {statusPayload?.git.dirty || 'unknown'}</p>
            {loadingBuilds ? <p className="mt-2 text-xs text-slate-400">Loading build history...</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
