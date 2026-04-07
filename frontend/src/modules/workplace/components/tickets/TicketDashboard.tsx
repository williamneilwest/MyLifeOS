import { Bot, RefreshCcw, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '../../../../components/ui';
import { TicketFilters } from './TicketFilters';
import { TicketDetailsModal } from './TicketDetailsModal';

type TicketValue = string | number | boolean | null | undefined;
type Ticket = Record<string, TicketValue>;
type ViewKey = 'all' | 'closed_today' | 'closed_week' | 'closed_year' | 'needs_ack' | 'sla_risk';

interface TicketApiResponse {
  success: boolean;
  data?: Ticket[];
  count?: number;
  error?: string;
}

interface TicketDashboardProps {
  refreshSignal?: number;
}

function text(value: TicketValue, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  const result = String(value).trim();
  return result || fallback;
}

function numberValue(value: TicketValue): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function updatedLabel(ticket: Ticket): string {
  const lastUpdateDays = numberValue(ticket.last_update_days);
  if (lastUpdateDays > 0) return `${Math.floor(lastUpdateDays)}d ago`;
  return text(ticket.updated_at || ticket.sys_updated_on, 'N/A');
}

function urgencyBadge(ticket: Ticket) {
  if (ticket.is_urgent) {
    return <span className="rounded-full border border-rose-400/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-medium text-rose-200">Urgent</span>;
  }
  if (ticket.is_stale) {
    return <span className="rounded-full border border-amber-400/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-200">Stale</span>;
  }
  return <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200">Current</span>;
}

function ticketKey(ticket: Ticket, index: number): string {
  const sysId = text(ticket.sys_id);
  if (sysId) return `sys:${sysId}`;
  const number = text(ticket.ticket_number || ticket.number);
  if (number) return `num:${number}`;
  return `idx:${index}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wildcardMatch(candidate: TicketValue, pattern: string): boolean {
  if (!pattern.trim()) return true;
  const source = text(candidate).toLowerCase();
  const normalized = pattern.trim().toLowerCase();
  const regexString = `^${escapeRegex(normalized).replace(/\\\*/g, '.*').replace(/\\\?/g, '.')}$`;
  return new RegExp(regexString, 'i').test(source);
}

function parseDate(value: TicketValue): Date | null {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function boolLike(value: TicketValue): boolean {
  const normalized = text(value).toLowerCase();
  return ['true', 'yes', '1', 'y'].includes(normalized);
}

function resolveStatus(ticket: Ticket): string {
  return text(ticket.status || ticket.state).toLowerCase();
}

function isClosed(ticket: Ticket): boolean {
  const status = resolveStatus(ticket);
  return status.includes('closed') || status.includes('resolved') || status.includes('done');
}

function isNeedsAck(ticket: Ticket): boolean {
  const status = resolveStatus(ticket);
  const ack = boolLike(ticket.acknowledged ?? ticket.is_acknowledged ?? ticket.ack);
  return (status.includes('new') || status.includes('open')) && !ack;
}

function isSlaRisk(ticket: Ticket): boolean {
  if (boolLike(ticket.sla_breached) || boolLike(ticket.will_breach_sla) || boolLike(ticket.is_urgent)) return true;
  const dueDate = parseDate(ticket.sla_due_at || ticket.sla_due || ticket.due_at || ticket.target_end);
  if (!dueDate) return false;
  const hoursLeft = (dueDate.getTime() - Date.now()) / 3_600_000;
  return hoursLeft <= 24;
}

function closedInRange(ticket: Ticket, since: Date): boolean {
  if (!isClosed(ticket)) return false;
  const closedDate = parseDate(ticket.closed_at || ticket.resolved_at || ticket.updated_at || ticket.sys_updated_on);
  if (!closedDate) return false;
  return closedDate >= since;
}

function csvRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let idx = 0; idx < line.length; idx += 1) {
    const char = line[idx];
    if (char === '"') {
      if (inQuotes && line[idx + 1] === '"') {
        current += '"';
        idx += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(textBlob: string): Ticket[] {
  const lines = textBlob
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = csvRow(lines[0]);

  return lines.slice(1).map((line) => {
    const values = csvRow(line);
    return headers.reduce<Ticket>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
}

const viewTabs: Array<{ key: ViewKey; label: string }> = [
  { key: 'all', label: 'All Tickets' },
  { key: 'closed_today', label: 'Closed Today' },
  { key: 'closed_week', label: 'Closed This Week' },
  { key: 'closed_year', label: 'Closed This Year' },
  { key: 'needs_ack', label: 'Needs Acknowledge' },
  { key: 'sla_risk', label: 'SLA Breach Risk' },
];

export function TicketDashboard({ refreshSignal = 0 }: TicketDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [staleOnly, setStaleOnly] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>('all');
  const [wildcard, setWildcard] = useState('');
  const [wildcardField, setWildcardField] = useState('');
  const [datasetLabel, setDatasetLabel] = useState('API');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets/latest', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = (await response.json()) as TicketApiResponse;

      if (!json.success) {
        throw new Error(json.error || 'API failure');
      }

      const rows = Array.isArray(json.data) ? json.data : [];
      setTickets(rows);
      setDatasetLabel('API');
      setLastFetchedAt(new Date());
      setError(null);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load ticket dashboard dataset';
      setError(message);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets, refreshSignal]);

  const assignees = useMemo(() => {
    return Array.from(new Set(tickets.map((t) => text(t.assignee)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [tickets]);

  const statuses = useMemo(() => {
    return Array.from(new Set(tickets.map((t) => text(t.status || t.state)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [tickets]);

  const priorities = useMemo(() => {
    return Array.from(new Set(tickets.map((t) => text(t.priority)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [tickets]);

  const filterableFields = useMemo(() => {
    return Array.from(new Set(tickets.flatMap((ticket) => Object.keys(ticket)))).sort((a, b) => a.localeCompare(b));
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const search = query.trim().toLowerCase();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(dayStart);
    weekStart.setDate(dayStart.getDate() - 7);

    const yearStart = new Date(dayStart.getFullYear(), 0, 1);

    return tickets.filter((ticket) => {
      if (statusFilter && text(ticket.status || ticket.state) !== statusFilter) return false;
      if (assigneeFilter !== 'all' && text(ticket.assignee) !== assigneeFilter) return false;
      if (priorityFilter && text(ticket.priority) !== priorityFilter) return false;
      if (staleOnly && !Boolean(ticket.is_stale)) return false;
      if (urgentOnly && !Boolean(ticket.is_urgent)) return false;

      if (activeView === 'closed_today' && !closedInRange(ticket, dayStart)) return false;
      if (activeView === 'closed_week' && !closedInRange(ticket, weekStart)) return false;
      if (activeView === 'closed_year' && !closedInRange(ticket, yearStart)) return false;
      if (activeView === 'needs_ack' && !isNeedsAck(ticket)) return false;
      if (activeView === 'sla_risk' && !isSlaRisk(ticket)) return false;

      if (wildcard.trim()) {
        if (wildcardField) {
          if (!wildcardMatch(ticket[wildcardField], wildcard)) return false;
        } else {
          const anyHit = Object.values(ticket).some((value) => wildcardMatch(value, wildcard));
          if (!anyHit) return false;
        }
      }

      if (!search) return true;
      const ticketNumber = text(ticket.ticket_number || ticket.number).toLowerCase();
      const title = text(ticket.title || ticket.short_description).toLowerCase();
      const assignee = text(ticket.assignee).toLowerCase();
      return ticketNumber.includes(search) || title.includes(search) || assignee.includes(search);
    });
  }, [tickets, query, statusFilter, assigneeFilter, priorityFilter, staleOnly, urgentOnly, activeView, wildcard, wildcardField]);

  const safeSelectedIndex = selectedIndex === null ? -1 : selectedIndex;

  const openAnalyzeStub = useCallback(() => {
    const payload = filteredTickets.slice(0, 30).map((ticket) => ({
      ticket_number: text(ticket.ticket_number || ticket.number),
      title: text(ticket.title || ticket.short_description),
      assignee: text(ticket.assignee),
      status: text(ticket.status || ticket.state),
      priority: text(ticket.priority),
      updated_at: text(ticket.updated_at || ticket.sys_updated_on),
      last_update_days: numberValue(ticket.last_update_days),
      is_stale: Boolean(ticket.is_stale),
      is_urgent: Boolean(ticket.is_urgent),
    }));

    const prompt = `Review these IT tickets and provide prioritization guidance:\n\n${JSON.stringify(payload, null, 2)}`;
    window.open(`https://chat.openai.com/?q=${encodeURIComponent(prompt)}`, '_blank', 'noopener,noreferrer');
  }, [filteredTickets]);

  useEffect(() => {
    const handler = () => {
      openAnalyzeStub();
    };
    window.addEventListener('workplace:analyze-tickets', handler as EventListener);
    return () => window.removeEventListener('workplace:analyze-tickets', handler as EventListener);
  }, [openAnalyzeStub]);

  const onUploadCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const raw = await file.text();
    const parsed = parseCsv(raw);

    if (!parsed.length) {
      setError('CSV file did not contain data rows.');
      return;
    }

    setTickets(parsed);
    setDatasetLabel(`CSV: ${file.name}`);
    setLastFetchedAt(new Date());
    setError(null);
    setLoading(false);
    event.target.value = '';
  };

  return (
    <Card
      title="Ticket Dashboard"
      description="Upload CSVs or use the latest shared ticket dataset."
      className="h-full w-full max-w-full overflow-x-hidden rounded-2xl border-teal-300/20 bg-zinc-900/45 shadow-[0_12px_40px_rgba(20,184,166,0.12)] backdrop-blur-xl"
    >
      <div className="w-full overflow-x-hidden">
        <div className="mb-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-white/15 bg-zinc-950/70 px-3 text-xs text-slate-200"
            onClick={() => {
              void fetchTickets();
            }}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border border-white/15 bg-zinc-950/70 px-3 text-xs text-slate-200">
            <Upload className="h-3.5 w-3.5" />
            Upload CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void onUploadCsv(event)} />
          </label>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-white/15 bg-zinc-950/70 px-3 text-xs text-slate-200"
            onClick={openAnalyzeStub}
          >
            <Bot className="h-3.5 w-3.5" />
            AI Analyze
          </button>
          <div className="ml-auto rounded-full border border-white/10 bg-zinc-950/60 px-2 py-1 text-[11px] text-slate-400">
            {tickets.length} total · {datasetLabel}
          </div>
        </div>

        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveView(tab.key)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeView === tab.key
                  ? 'border-cyan-300/40 bg-cyan-500/20 text-cyan-100'
                  : 'border-white/10 bg-zinc-950/50 text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-2 overflow-visible">
          <TicketFilters
            search={query}
            wildcard={wildcard}
            field={wildcardField}
            status={statusFilter}
            assignee={assigneeFilter === 'all' ? '' : assigneeFilter}
            priority={priorityFilter}
            staleOnly={staleOnly}
            urgentOnly={urgentOnly}
            statuses={statuses}
            assignees={assignees}
            priorities={priorities}
            filterableFields={filterableFields}
            onSearch={setQuery}
            onWildcard={setWildcard}
            onField={setWildcardField}
            onStatus={setStatusFilter}
            onAssignee={(value) => setAssigneeFilter(value || 'all')}
            onPriority={setPriorityFilter}
            onStaleOnly={setStaleOnly}
            onUrgentOnly={setUrgentOnly}
          />
        </div>

        <div className="mb-2 text-[11px] text-slate-500">
          Last updated {lastFetchedAt ? `${Math.max(0, Math.floor((Date.now() - lastFetchedAt.getTime()) / 60000))} min ago` : 'just now'}
        </div>

        {loading ? (
          <div className="grid gap-2">
            {[0, 1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-[72px] animate-pulse rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-900/80 via-zinc-800/60 to-zinc-900/80"
              />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>
        ) : null}

        {!loading && !error && filteredTickets.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-3 text-sm text-slate-400">No tickets available.</p>
        ) : null}

        {!loading && !error && filteredTickets.length > 0 ? (
          <>
            <div className="block md:hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`mobile-${filteredTickets.length}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="flex max-h-[54vh] flex-col gap-2 overflow-y-auto px-1"
                >
                  {filteredTickets.map((ticket, index) => (
                    <motion.button
                      key={ticketKey(ticket, index)}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      className="w-full rounded-xl border border-white/10 bg-zinc-900/60 p-3 text-left shadow-sm backdrop-blur"
                      onClick={() => setSelectedIndex(index)}
                    >
                      <div className="truncate text-sm font-medium text-white">
                        {text(ticket.title || ticket.short_description, 'No summary')}
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-400">
                        <span className="truncate">{text(ticket.assignee, 'Unassigned')}</span>
                        <span>{text(ticket.priority, 'N/A')}</span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                        <span className="truncate">Updated: {updatedLabel(ticket)}</span>
                        {urgencyBadge(ticket)}
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2">Ticket</th>
                    <th className="px-3 py-2">Summary</th>
                    <th className="px-3 py-2">Assignee</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Updated</th>
                    <th className="px-3 py-2">State</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket, index) => (
                    <tr
                      key={ticketKey(ticket, index)}
                      className="cursor-pointer border-b border-white/5 bg-zinc-900/30 transition-colors hover:bg-zinc-800/50"
                      onClick={() => setSelectedIndex(index)}
                    >
                      <td className="px-3 py-2">{text(ticket.ticket_number || ticket.number, 'N/A')}</td>
                      <td className="max-w-[340px] px-3 py-2">
                        <p className="truncate">{text(ticket.title || ticket.short_description, 'No summary')}</p>
                      </td>
                      <td className="px-3 py-2">{text(ticket.assignee, 'Unassigned')}</td>
                      <td className="px-3 py-2">{text(ticket.priority, 'N/A')}</td>
                      <td className="px-3 py-2">{updatedLabel(ticket)}</td>
                      <td className="px-3 py-2">{text(ticket.status || ticket.state, 'Unknown')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        <TicketDetailsModal
          open={safeSelectedIndex >= 0}
          tickets={filteredTickets as Array<Record<string, string | number | boolean>>}
          currentIndex={Math.max(safeSelectedIndex, 0)}
          onChangeIndex={(index) => setSelectedIndex(index)}
          onClose={() => setSelectedIndex(null)}
        />
      </div>
    </Card>
  );
}
