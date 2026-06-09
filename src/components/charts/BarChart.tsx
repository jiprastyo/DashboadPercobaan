'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

interface BarConfig {
  dataKey: string;
  label: string;
  color: string;
}

interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: BarConfig[];
  height?: number;
  containerMinWidth?: number;
  layout?: 'vertical' | 'horizontal';
  showGrid?: boolean;
  showLegend?: boolean;
  highlightKey?: string;
  highlightColor?: string;
  barSize?: number;
  xTickAngle?: number;
  xTickInterval?: number;
  xTickHeight?: number;
  xTickFontSize?: number;
  valueFormatter?: (value: any, name: string) => string;
}

export default function BarChart({
  data,
  xKey,
  bars,
  height = 300,
  containerMinWidth,
  layout = 'horizontal',
  showGrid = true,
  showLegend = false,
  highlightKey,
  highlightColor = '#0D9488',
  barSize,
  xTickAngle = 0,
  xTickInterval,
  xTickHeight,
  xTickFontSize = 12,
  valueFormatter,
}: BarChartProps) {
  const isVertical = layout === 'vertical';

  return (
    <div style={containerMinWidth ? { minWidth: `${containerMinWidth}px` } : undefined}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout={isVertical ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 20, left: isVertical ? 80 : 10, bottom: isVertical ? 5 : Math.max(5, xTickHeight ?? 5) }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#F3F4F6"
              horizontal={!isVertical}
              vertical={isVertical}
            />
          )}
          {isVertical ? (
            <>
              <XAxis
                type="number"
                tick={{ fontSize: xTickFontSize, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                type="category"
                dataKey={xKey}
                tick={{ fontSize: xTickFontSize, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                width={75}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: xTickFontSize, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                angle={xTickAngle}
                interval={xTickInterval}
                height={xTickHeight}
                textAnchor={xTickAngle === 0 ? 'middle' : 'end'}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
              />
            </>
          )}
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
          {showLegend && <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />}
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.label}
              fill={bar.color}
              radius={[4, 4, 0, 0]}
              barSize={barSize}
            >
              {highlightKey &&
                data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      String(entry[xKey]) === highlightKey
                        ? highlightColor
                        : bar.color
                    }
                  />
                ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
