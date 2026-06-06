'use client';

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SparkLineProps {
  data: { value: number }[];
  color?: string;
  width?: number;
  height?: number;
}

export default function SparkLine({
  data,
  color = '#0D9488',
  width = 80,
  height = 32,
}: SparkLineProps) {
  if (!data || data.length === 0) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1 || 1;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={[min - padding, max + padding]} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
