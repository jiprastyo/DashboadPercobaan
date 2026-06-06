'use client';

import { cn } from '@/lib/utils';
import SparkLine from '@/components/charts/SparkLine';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  sparkData?: { value: number }[];
  sparkColor?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  change,
  sparkData,
  sparkColor = '#0D9488',
  icon,
  className,
}: StatCardProps) {
  const changeColor =
    change?.direction === 'up'
      ? 'text-emerald-600'
      : change?.direction === 'down'
        ? 'text-red-600'
        : 'text-gray-400';

  const changeArrow =
    change?.direction === 'up' ? '▲' : change?.direction === 'down' ? '▼' : '—';

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg p-5',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {icon && <span className="text-gray-400">{icon}</span>}
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
              {title}
            </h3>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
          {change && (
            <div className={cn('flex items-center gap-1 mt-2 text-sm font-medium', changeColor)}>
              <span className="text-xs">{changeArrow}</span>
              <span>{change.label}</span>
            </div>
          )}
        </div>
        {sparkData && sparkData.length > 0 && (
          <div className="ml-4 flex-shrink-0">
            <SparkLine data={sparkData} color={sparkColor} />
          </div>
        )}
      </div>
    </div>
  );
}
