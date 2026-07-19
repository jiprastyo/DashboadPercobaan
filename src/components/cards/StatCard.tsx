'use client';

import { ExternalLink, Info, Minus, TrendingDown, TrendingUp } from 'lucide-react';
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
  sparkColor = 'var(--app-teal)',
  sourceUrl,
  icon,
  info,
  className,
}: StatCardProps) {
  const changeClass =
    change?.direction === 'up'
      ? 'text-[var(--app-success)]'
      : change?.direction === 'down'
        ? 'text-[var(--app-danger)]'
        : 'text-[var(--app-subtle)]';

  const ChangeIcon =
    change?.direction === 'up' ? TrendingUp : change?.direction === 'down' ? TrendingDown : Minus;

  return (
    <article
      className={cn(
        'min-w-0 border border-[var(--app-border)] bg-[var(--app-surface)] p-3 transition-colors hover:border-[var(--app-border-strong)]',
        className
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex min-w-0 items-center gap-2">
            {icon && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--app-border)] bg-[var(--app-bg-soft)] text-[var(--app-accent-ink)]">
                {icon}
              </span>
            )}
            <h3 className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
              {title}
            </h3>

            {info && (
              <div className="group relative flex shrink-0 items-center">
                <Info className="h-3.5 w-3.5 cursor-help text-[var(--app-subtle)] transition-colors hover:text-[var(--app-text)]" />
                <div className="absolute left-1/2 bottom-full z-50 mb-2 hidden w-72 -translate-x-1/2 border border-[var(--app-border-strong)] bg-[var(--app-surface-raised)] p-3 text-xs text-[var(--app-muted)] shadow-sm group-hover:block">
                  <p className="mb-1 font-bold text-[var(--app-text)]">Arti indikator</p>
                  <p className="leading-relaxed">{info.arti}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--app-border)] pt-2">
                    <div>
                      <span className="block text-[10px] uppercase tracking-[0.08em] text-[var(--app-subtle)]">
                        Sumber
                      </span>
                      <span className="font-semibold text-[var(--app-text)]">{info.sumber}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-[0.08em] text-[var(--app-subtle)]">
                        Rilis
                      </span>
                      <span className="font-semibold text-[var(--app-text)]">{info.periodik}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[var(--app-subtle)] transition hover:text-[var(--app-link)] focus-visible:app-focus"
                title="Verifikasi sumber data"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <p className="text-2xl font-extrabold tracking-tight text-[var(--app-text)]">{value}</p>
          {subtitle && (
            <p className="mt-1 line-clamp-2 text-xs font-medium text-[var(--app-muted)]">{subtitle}</p>
          )}
          {change && (
            <div className={cn('mt-2 flex items-center gap-1.5 text-xs font-bold', changeClass)}>
              <ChangeIcon className="h-3.5 w-3.5" />
              <span>{change.label}</span>
            </div>
          )}
        </div>

        {sparkData && sparkData.length > 0 && (
          <div className="hidden shrink-0 sm:block">
            <SparkLine data={sparkData} color={sparkColor} />
          </div>
        )}
      </div>
    </article>
  );
}
