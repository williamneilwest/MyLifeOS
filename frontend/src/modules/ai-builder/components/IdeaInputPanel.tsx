import { Button, Card } from '../../../components/ui';

interface IdeaInputPanelProps {
  idea: string;
  loading: boolean;
  onIdeaChange: (value: string) => void;
  onGenerate: () => void;
}

export function IdeaInputPanel({ idea, loading, onIdeaChange, onGenerate }: IdeaInputPanelProps) {
  return (
    <Card title="Idea Input" description="Describe what you want to build. AI Builder will generate a safe implementation plan.">
      <div className="space-y-4">
        <textarea
          value={idea}
          onChange={(event) => onIdeaChange(event.target.value)}
          placeholder="Type an idea... I'll turn it into a project plan"
          rows={5}
          className="w-full rounded-xl border border-white/10 bg-zinc-950/70 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40"
        />
        <Button onClick={onGenerate} disabled={loading || !idea.trim()}>
          {loading ? 'Generating Build Plan...' : 'Generate Build Plan'}
        </Button>
      </div>
    </Card>
  );
}
