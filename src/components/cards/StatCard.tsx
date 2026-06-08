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
  info?: {
    arti: string;
    sumber: string;
    periodik: string;
  };
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
  info,
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
        'bg-white border-2 border-gray-900 rounded-none p-3 relative overflow-visible',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {icon && <span className="text-gray-900">{icon}</span>}
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider truncate">
              {title}
            </h3>
            
            {info && (
              <div className="group relative flex items-center">
                <svg className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {/* Tooltip Content */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50">
                  <p className="font-semibold mb-1">Arti Indikator</p>
                  <p className="text-gray-300 mb-2 leading-relaxed">{info.arti}</p>
                  <div className="flex justify-between border-t border-gray-700 pt-2 mt-1">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Sumber Data</span>
                      <span className="font-medium text-[11px]">{info.sumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 block text-[10px]">Periode Rilis</span>
                      <span className="font-medium text-[11px]">{info.periodik}</span>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            )}

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
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-[11px] font-medium text-gray-500 mt-0.5 uppercase tracking-wide">{subtitle}</p>
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
