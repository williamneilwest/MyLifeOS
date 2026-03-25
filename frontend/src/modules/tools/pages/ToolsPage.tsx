import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Pencil, Plus, QrCode, Trash2, Wrench } from 'lucide-react';
import { Badge, Button, Card, Modal, SectionHeader } from '../../../components/ui';
import { toolsService } from '../../../services/toolsService';
import type { ToolModule, ToolModuleType } from '../types';

interface QrHistoryEntry {
  id: string;
  text: string;
  createdAt: string;
}

function parseQrHistory(config: Record<string, unknown>): QrHistoryEntry[] {
  const raw = config.history;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const candidate = entry as Record<string, unknown>;
      const text = typeof candidate.text === 'string' ? candidate.text : '';
      if (!text.trim()) return null;
      return {
        id: typeof candidate.id === 'string' ? candidate.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text,
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
      };
    })
    .filter((entry): entry is QrHistoryEntry => Boolean(entry));
}

function QrModule({ module }: { module: ToolModule }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(String(module.config.defaultText || ''));
  const [saveError, setSaveError] = useState<string | null>(null);
  const history = useMemo(() => parseQrHistory(module.config), [module.config]);
  const qrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(text || ' ')}`,
    [text],
  );
  const displayedHistory = useMemo(() => history.slice(0, 8), [history]);

  const saveMutation = useMutation({
    mutationFn: (config: Record<string, unknown>) =>
      toolsService.updateModule(module.id, {
        name: module.name,
        type: module.type,
        config,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tool-modules'] });
      setSaveError(null);
    },
    onError: (error) => {
      setSaveError(error instanceof Error ? error.message : 'Failed to save QR code');
    },
  });

  return (
    <Card title={module.name} description="Generate QR codes instantly.">
      <div className="space-y-3">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Enter text or URL"
          className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
        />
        <div className="flex justify-center rounded-xl border border-white/10 bg-zinc-950/60 p-4">
          <img src={qrUrl} alt="Generated QR code" className="h-52 w-52 rounded-lg bg-white p-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(text)}>Copy Text</Button>
          <Button
            variant="outline"
            disabled={saveMutation.isPending || !text.trim()}
            onClick={() => {
              const cleanText = text.trim();
              if (!cleanText) {
                setSaveError('Text is required to save a QR code.');
                return;
              }
              const withoutDuplicate = history.filter((item) => item.text !== cleanText);
              const nextHistory: QrHistoryEntry[] = [
                {
                  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                  text: cleanText,
                  createdAt: new Date().toISOString(),
                },
                ...withoutDuplicate,
              ].slice(0, 40);

              saveMutation.mutate({
                ...module.config,
                defaultText: cleanText,
                history: nextHistory,
              });
            }}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save to History'}
          </Button>
          <a
            href={qrUrl}
            download="qr-code.png"
            className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            Download QR
          </a>
        </div>
        {saveError ? <p className="text-xs text-rose-300">{saveError}</p> : null}

        <details className="rounded-xl border border-white/10 bg-zinc-950/50 p-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-200">
            QR History ({history.length})
          </summary>
          <div className="mt-3 space-y-2">
            {!history.length ? <p className="text-xs text-slate-400">No saved QR codes yet.</p> : null}
            {displayedHistory.map((entry) => {
              const entryQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(entry.text)}`;
              return (
                <div key={entry.id} className="rounded-lg border border-white/10 bg-zinc-900/60 p-2">
                  <p className="truncate text-sm text-slate-200">{entry.text}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => setText(entry.text)}>Load</Button>
                    <a
                      href={entryQrUrl}
                      download="qr-code.png"
                      className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                    >
                      Download
                    </a>
                  </div>
                </div>
              );
            })}
            {history.length > displayedHistory.length ? (
              <p className="text-xs text-slate-500">Showing latest {displayedHistory.length} of {history.length} saved codes.</p>
            ) : null}
          </div>
        </details>
      </div>
    </Card>
  );
}

function ShortcutModule({ module }: { module: ToolModule }) {
  const label = String(module.config.label || module.name);
  const url = String(module.config.url || '/scripts');

  return (
    <Card title={module.name} description="Quick launch utility.">
      <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
        <p className="text-sm text-slate-300">{label}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{url}</p>
        <a
          href={url}
          className="mt-3 inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm text-white"
        >
          <ExternalLink className="h-4 w-4" />
          Open
        </a>
      </div>
    </Card>
  );
}

function ModuleRenderer({ module }: { module: ToolModule }) {
  if (module.type === 'qr') return <QrModule module={module} />;
  if (module.type === 'shortcut') return <ShortcutModule module={module} />;
  return <Card title={module.name} description={`Unsupported module type: ${module.type}`} />;
}

export function ToolsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ToolModule | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<ToolModuleType>('qr');
  const [config, setConfig] = useState('{}');
  const [error, setError] = useState<string | null>(null);

  const modulesQuery = useQuery({
    queryKey: ['tool-modules'],
    queryFn: toolsService.getModules,
  });

  const utilityModules = useMemo(
    () => (modulesQuery.data?.modules || []).filter((module) => module.type !== 'services'),
    [modulesQuery.data?.modules],
  );

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; type: ToolModuleType; config: Record<string, unknown> }) => toolsService.createModule(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tool-modules'] });
      setModalOpen(false);
      setEditing(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; type: ToolModuleType; config: Record<string, unknown> } }) =>
      toolsService.updateModule(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tool-modules'] });
      setModalOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => toolsService.deleteModule(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tool-modules'] });
    },
  });

  const openAdd = () => {
    setEditing(null);
    setName('');
    setType('qr');
    setConfig('{}');
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (module: ToolModule) => {
    setEditing(module);
    setName(module.name);
    setType(module.type);
    setConfig(JSON.stringify(module.config || {}, null, 2));
    setError(null);
    setModalOpen(true);
  };

  return (
    <div className="w-full max-w-full space-y-5 overflow-x-hidden">
      <SectionHeader
        eyebrow="Module"
        title="Tools"
        description="Utility modules for daily workflows."
        actions={<Badge variant="info">Mobile First</Badge>}
      />

      <div className="flex justify-end">
        <Button variant="outline" onClick={openAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Tool Module
        </Button>
      </div>

      {modulesQuery.isLoading ? <p className="text-sm text-slate-400">Loading tool modules...</p> : null}
      {modulesQuery.error instanceof Error ? <p className="text-sm text-rose-300">{modulesQuery.error.message}</p> : null}

      <div className="grid gap-4">
        {utilityModules.map((module) => (
          <div key={module.id} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-2">
            <div className="mb-2 flex items-center justify-between gap-2 px-2">
              <div className="inline-flex items-center gap-2 text-sm text-slate-200">
                {module.type === 'qr' ? <QrCode className="h-4 w-4 text-cyan-300" /> : <Wrench className="h-4 w-4 text-cyan-300" />}
                <span>{module.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:text-cyan-200"
                  onClick={() => openEdit(module)}
                  aria-label={`Edit ${module.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:text-rose-200"
                  onClick={() => {
                    if (!window.confirm(`Remove ${module.name}?`)) return;
                    deleteMutation.mutate(module.id);
                  }}
                  aria-label={`Delete ${module.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <ModuleRenderer module={module} />
          </div>
        ))}
      </div>

      {!modulesQuery.isLoading && !utilityModules.length ? (
        <Card>
          <p className="text-sm text-slate-400">No utility modules yet. Add QR or Shortcut modules.</p>
        </Card>
      ) : null}

      <Modal title={editing ? 'Edit Tool Module' : 'Add Tool Module'} open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            />
          </label>
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Type
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ToolModuleType)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            >
              <option value="qr">qr</option>
              <option value="shortcut">shortcut</option>
            </select>
          </label>
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Config (JSON)
            <textarea
              value={config}
              onChange={(event) => setConfig(event.target.value)}
              rows={8}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 font-mono text-xs text-white outline-none focus:border-cyan-300/40"
            />
          </label>
          {error ? <p className="rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={() => {
                if (!name.trim()) {
                  setError('Name is required');
                  return;
                }
                try {
                  const parsed = JSON.parse(config || '{}') as Record<string, unknown>;
                  setError(null);
                  const payload = { name: name.trim(), type, config: parsed };
                  if (editing) {
                    updateMutation.mutate({ id: editing.id, payload });
                    return;
                  }
                  createMutation.mutate(payload);
                } catch {
                  setError('Config must be valid JSON');
                }
              }}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
