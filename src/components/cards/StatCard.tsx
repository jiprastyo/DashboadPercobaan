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
  sourceUrl?: string;
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
  sourceUrl,
  icon,
  className,
}: StatCardProps) {
  // We need ExternalLink from lucide-react. Let's assume it's available or we can just use an SVG.
  // Wait, I should import ExternalLink. I'll just use a small text '🔗' or SVG for simplicity to avoid import issues.
  // Actually, I can just use a simple SVG icon for external link.
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
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[#0D9488] transition-colors flex-shrink-0"
                title="Verifikasi Sumber Data"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            )}
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
