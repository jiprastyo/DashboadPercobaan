import { cn, formatRelativeTime } from '@/lib/utils';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { HealthStatus } from '@/lib/constants';

export interface SourceStatusCardEntry {
  name: string;
  health: HealthStatus;
  lastFetch?: string;
  items: number;
  reason: string;
}

interface SourceStatusCardProps {
  source: SourceStatusCardEntry;
  className?: string;
}

// Token-driven (not the old fixed emerald-50/amber-50/red-50 Tailwind
// classes) so the card reads correctly in both light and dark -- the same
// fix Badge.tsx already got in Stage 0.6.
const statusConfig: Record<HealthStatus, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  ok: {
    icon: CheckCircle,
    color: 'text-[var(--app-success)]',
    bg: 'bg-[color:color-mix(in_srgb,var(--app-success)_12%,var(--app-surface))]',
    label: 'OK',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-[var(--app-warning)]',
    bg: 'bg-[color:color-mix(in_srgb,var(--app-warning)_12%,var(--app-surface))]',
    label: 'Peringatan',
  },
  error: {
    icon: XCircle,
    color: 'text-[var(--app-danger)]',
    bg: 'bg-[color:color-mix(in_srgb,var(--app-danger)_12%,var(--app-surface))]',
    label: 'Error',
  },
};

/**
 * Per-scraper health card for the /operasional grid (Stage 4.3). Consumes
 * the same `latestOps` shape OperasionalClient already computes from
 * `freshnessFor()` -- no separate data path, no SourceMetadata coupling.
 */
export default function SourceStatusCard({ source, className }: SourceStatusCardProps) {
  const config = statusConfig[source.health];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-3 border border-[var(--app-border)] bg-[var(--app-surface)] p-3', className)}>
      <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[var(--app-border)]', config.bg)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-[var(--app-text)]">
            {source.name}
          </span>
          <span className="flex-shrink-0 text-xs text-[var(--app-subtle)]">
            {source.items} item
          </span>
        </div>
        <p className="text-xs text-[var(--app-muted)]">
          {source.lastFetch ? formatRelativeTime(source.lastFetch) : 'belum tercatat'}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--app-subtle)]" title={source.reason}>
          {source.reason}
        </p>
      </div>
    </div>
  );
}
