'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TrendSeries {
  keyword: string;
  color: string;
}

interface TrendChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: TrendSeries[];
  height?: number;
}

const COLORS = [
  '#0D9488', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6',
  '#EC4899', '#10B981', '#6366F1',
];

export default function TrendChart({
  data,
  xKey,
  series,
  height = 350,
}: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: 'var(--chart-axis)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--chart-grid)' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--chart-axis)' }}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          label={{ value: 'Interest', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--chart-axis)' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--app-border)',
            borderRadius: 0,
            fontSize: '12px',
            color: 'var(--app-text)',
            boxShadow: 'none',
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
        {series.map((s, idx) => (
          <Line
            key={s.keyword}
            type="monotone"
            dataKey={s.keyword}
            name={s.keyword}
            stroke={s.color || COLORS[idx % COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: s.color || COLORS[idx % COLORS.length], strokeWidth: 2, fill: '#fff' }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
