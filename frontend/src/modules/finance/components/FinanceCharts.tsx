import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PIE_COLORS = ['#10b981', '#06b6d4', '#22d3ee', '#14b8a6', '#34d399', '#047857'];

type ChartType = 'line' | 'bar' | 'pie';

interface FinanceChartsProps {
  type: ChartType;
  data: Array<Record<string, number | string>>;
  xKey?: string;
  yKey?: string;
  dataKeys?: string[];
  nameKey?: string;
  height?: number;
}

export function FinanceCharts({ type, data, xKey = 'label', yKey = 'total', dataKeys = [], nameKey = 'name', height = 300 }: FinanceChartsProps) {
  if (!data.length) {
    return <div className="flex h-[220px] items-center justify-center rounded-xl border border-white/10 bg-zinc-950/40 text-sm text-zinc-400">No chart data available yet.</div>;
  }

  if (type === 'line') {
    const lineKeys = dataKeys.length ? dataKeys : [yKey];
    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey={xKey} stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Legend />
            {lineKeys.map((key, index) => (
              <Line key={key} type="monotone" dataKey={key} stroke={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'bar') {
    const barKeys = dataKeys.length ? dataKeys : [yKey];
    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey={xKey} stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Legend />
            {barKeys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={PIE_COLORS[index % PIE_COLORS.length]} radius={[8, 8, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey={yKey} nameKey={nameKey} innerRadius={58} outerRadius={92} paddingAngle={3}>
            {data.map((entry, index) => (
              <Cell key={`${String(entry[nameKey])}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
