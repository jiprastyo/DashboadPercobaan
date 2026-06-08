'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';

interface LineChartConfig {
  dataKey: string;
  label: string;
  color: string;
  strokeDasharray?: string;
}

interface LineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  lines: LineChartConfig[];
  height?: number;
  referenceLine?: { y: number; label: string; color?: string };
  showGrid?: boolean;
  showLegend?: boolean;
  yDomain?: [number | string, number | string];
  xLabel?: string;
  yLabel?: string;
  valueFormatter?: (value: any, name: string) => string;
}

export default function LineChart({
  data,
  xKey,
  lines,
  height = 300,
  referenceLine,
  showGrid = true,
  showLegend = true,
  yDomain,
  xLabel,
  yLabel,
  valueFormatter,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />}
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
          label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fontSize: 12, fill: '#6B7280' } : undefined}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickLine={false}
          axisLine={false}
          domain={yDomain}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12, fill: '#6B7280' } : undefined}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '13px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
          formatter={(value: any, name: any) => {
            if (valueFormatter) {
              return [valueFormatter(value, String(name)), name];
            }
            if (typeof value === 'number') {
              const nameStr = String(name);
              if (nameStr.includes('%') || nameStr.includes('(%)')) {
                const formatted = new Intl.NumberFormat('id-ID', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(value);
                return [`${formatted}%`, name];
              }
              return [new Intl.NumberFormat('id-ID').format(value), name];
            }
            return [value, name];
          }}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          />
        )}
        {referenceLine && (
          <ReferenceLine
            y={referenceLine.y}
            label={{ value: referenceLine.label, position: 'right', fontSize: 11, fill: referenceLine.color || '#6B7280' }}
            stroke={referenceLine.color || '#6B7280'}
            strokeDasharray="5 5"
          />
        )}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            strokeDasharray={line.strokeDasharray}
            dot={{ r: 3, fill: line.color }}
            activeDot={{ r: 5, stroke: line.color, strokeWidth: 2, fill: '#FFFFFF' }}
            connectNulls={true}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
