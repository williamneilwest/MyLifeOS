import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Button, Card } from '../../../components/ui';
import { createProjectFromIdea } from '../../../services/api';

export function AIProjectGenerator() {
  const queryClient = useQueryClient();
  const [idea, setIdea] = useState('');
  const [generateTasks, setGenerateTasks] = useState(true);

  const mutation = useMutation({
    mutationFn: ({ prompt, withTasks }: { prompt: string; withTasks: boolean }) => createProjectFromIdea(prompt, withTasks),
    onSuccess: async () => {
      setIdea('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ]);
    },
  });

  return (
    <Card
      className={mutation.isPending ? 'animate-pulse' : ''}
      title="AI Project Generator"
      description="Turn rough ideas into structured projects with an execution plan."
      variant="featured"
    >
      <div className="space-y-4">
        <textarea
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="Type an idea... I'll turn it into a project plan"
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-zinc-950/70 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40"
        />

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={generateTasks}
            onChange={(event) => setGenerateTasks(event.target.checked)}
          />
          Generate tasks from plan
        </label>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => mutation.mutate({ prompt: idea.trim(), withTasks: generateTasks })}
            disabled={mutation.isPending || !idea.trim()}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {mutation.isPending ? 'Generating...' : 'Generate Project'}
          </Button>
        </div>

        {mutation.isError ? (
          <p className="text-sm text-rose-300">
            {mutation.error instanceof Error && mutation.error.message.includes('404')
              ? 'AI endpoint not found (404): expected /api/ai/create-project'
              : mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to generate project'}
          </p>
        ) : null}

        {mutation.data ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
            <p className="text-sm font-semibold text-emerald-200">{mutation.data.project.name}</p>
            <p className="mt-1 text-xs text-emerald-100/80">{mutation.data.project.description || 'No description provided'}</p>
            <pre className="mt-3 whitespace-pre-wrap text-xs text-emerald-50/80">{mutation.data.project.notes}</pre>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
