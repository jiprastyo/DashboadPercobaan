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
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#6B7280' }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6B7280' }}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          label={{ value: 'Interest', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#9CA3AF' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '12px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
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
