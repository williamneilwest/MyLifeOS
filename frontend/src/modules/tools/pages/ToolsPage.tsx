import { Badge, Card, SectionHeader } from '../../../components/ui';
import { CommandSnippetList } from '../components/CommandSnippetList';
import { ModuleVisibilityCard } from '../components/ModuleVisibilityCard';
import { QuickLinkForm } from '../components/QuickLinkForm';
import { ToolsSummaryCard } from '../components/ToolsSummaryCard';
import { useToolsData } from '../hooks/useToolsData';
import { useToolsStore } from '../state/useToolsStore';

export function ToolsPage() {
  const { links, snippets, overview } = useToolsData();
  const addLink = useToolsStore((state) => state.addLink);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module"
        title="Tools"
        description="Save frequently used links and terminal snippets for quick execution."
        actions={<Badge variant="info">Persistent</Badge>}
      />

      <ToolsSummaryCard overview={overview} />

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <h3 className="text-lg font-semibold text-white">Quick Links</h3>
          <div className="mt-4 space-y-3">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
              >
                <div>
                  <p className="text-sm font-medium text-white">{link.name}</p>
                  <p className="text-xs text-slate-400">{link.category}</p>
                </div>
                <span className="text-xs text-cyan-300">Open</span>
              </a>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Add Link</h3>
          <div className="mt-4">
            <QuickLinkForm onSubmit={addLink} />
          </div>
        </Card>
      </section>

      <ModuleVisibilityCard />

      <CommandSnippetList snippets={snippets} />
    </div>
  );
}
