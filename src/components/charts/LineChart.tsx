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
  valueFormatter?: (value: unknown, name: string) => string;
  xType?: 'category' | 'number';
  xDomain?: [number | string, number | string];
  xTickFormatter?: (value: unknown) => string;
  tooltipLabelFormatter?: (value: unknown) => string;
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
  xType = 'category',
  xDomain,
  xTickFormatter,
  tooltipLabelFormatter,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />}
        <XAxis
          dataKey={xKey}
          type={xType}
          scale={xType === 'number' ? 'time' : 'auto'}
          domain={xDomain}
          tick={{ fontSize: 12, fill: 'var(--chart-axis)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--chart-grid)' }}
          tickFormatter={xTickFormatter}
          label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fontSize: 12, fill: 'var(--chart-axis)' } : undefined}
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--chart-axis)' }}
          tickLine={false}
          axisLine={false}
          domain={yDomain}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--chart-axis)' } : undefined}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--app-border)',
            borderRadius: 0,
            fontSize: '13px',
            color: 'var(--app-text)',
            boxShadow: 'none',
          }}
          labelFormatter={(label) => {
            if (tooltipLabelFormatter) {
              return tooltipLabelFormatter(label);
            }
            return String(label);
          }}
          formatter={(value, name) => {
            if (valueFormatter) {
              return [valueFormatter(value, String(name)), String(name)];
            }
            if (typeof value === 'number') {
              const nameStr = String(name);
              if (nameStr.includes('%') || nameStr.includes('(%)')) {
                const formatted = new Intl.NumberFormat('id-ID', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(value);
                return [`${formatted}%`, String(name)];
              }
              return [new Intl.NumberFormat('id-ID').format(value), String(name)];
            }
            return [String(value), String(name)];
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
            label={{ value: referenceLine.label, position: 'right', fontSize: 11, fill: referenceLine.color || 'var(--chart-axis)' }}
            stroke={referenceLine.color || 'var(--chart-axis)'}
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
