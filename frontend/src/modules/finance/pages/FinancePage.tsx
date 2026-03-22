import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Badge, Card, SectionHeader } from '../../../components/ui';
import { FinanceForm } from '../components/FinanceForm';
import { FinanceSummary } from '../components/FinanceSummary';
import { useFinanceInsights } from '../hooks/useFinanceInsights';
import { useFinanceStore } from '../state/useFinanceStore';

const COLORS = ['#22d3ee', '#38bdf8', '#34d399'];

export function FinancePage() {
  const addEntry = useFinanceStore((state) => state.addEntry);
  const { entries, income, expense, savings, net, fixedTarget, saveTarget } = useFinanceInsights();

  const grouped = [
    { name: 'Income', value: income },
    { name: 'Expense', value: expense },
    { name: 'Savings', value: savings },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module"
        title="Finance"
        description="Track cash flow, savings behavior, and monthly trend lines with persistent data."
        actions={<Badge variant="info">Local Storage</Badge>}
      />

      <FinanceSummary entries={entries} />

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="h-[360px]">
          <h3 className="text-lg font-semibold text-white">Cashflow Mix</h3>
          <p className="mt-1 text-sm text-slate-400">Income vs expense vs savings for your current dataset.</p>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={grouped} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={5}>
                  {grouped.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Add Entry</h3>
          <p className="mt-1 text-sm text-slate-400">Capture a transaction quickly. API import can replace this later.</p>
          <div className="mt-5">
            <FinanceForm onSubmit={addEntry} />
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h3 className="text-lg font-semibold text-white">Recent Entries</h3>
          <div className="mt-4 space-y-3">
            {entries.slice(0, 12).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{entry.name}</p>
                  <p className="text-xs text-slate-400">
                    {entry.category} • {entry.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">${entry.amount.toLocaleString()}</p>
                  <p className="text-xs capitalize text-slate-400">{entry.type}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Health Check</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
              <span className="text-slate-400">Net Monthly</span>
              <Badge variant={net >= 0 ? 'success' : 'warning'}>{net >= 0 ? 'Positive' : 'Negative'}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
              <span className="text-slate-400">Expense Ratio</span>
              <span className="text-white">{fixedTarget}%</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
              <span className="text-slate-400">Savings Ratio</span>
              <span className="text-white">{saveTarget}%</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
