'use client';

import { cn, formatRelativeTime } from '@/lib/utils';
import type { HealthStatus } from '@/lib/constants';

interface SourceFreshnessBadgeProps {
  status: HealthStatus;
  lastFetch?: string;
  reason?: string;
  className?: string;
}

// Token-colored dot, not an icon set addition -- the badge conveys real
// per-scraper health, nothing decorative (design-taste: badges allowed
// only as real semantic status).
const DOT_COLOR: Record<HealthStatus, string> = {
  ok: 'var(--app-success)',
  warning: 'var(--app-warning)',
  error: 'var(--app-danger)',
};

const TEXT_COLOR: Record<HealthStatus, string> = {
  ok: 'var(--app-success)',
  warning: 'var(--app-warning)',
  error: 'var(--app-danger)',
};

function isValidDate(value?: string): value is string {
  return Boolean(value && Number.isFinite(new Date(value).getTime()));
}

/**
 * Small inline freshness indicator for "Sumber Data" attribution boxes.
 * Build-time only: the underlying status is computed once per deploy by
 * `getSourceFreshness()` (data-loader-server.ts) and frozen until the next
 * build -- this component only formats it, it does not poll or refetch.
 */
export default function SourceFreshnessBadge({
  status,
  lastFetch,
  reason,
  className,
}: SourceFreshnessBadgeProps) {
  const label = isValidDate(lastFetch) ? `diperbarui ${formatRelativeTime(lastFetch)}` : 'belum tercatat';

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-[11px] text-[var(--app-muted)]', className)}
      title={reason ? `${reason} (per build terakhir)` : 'Status per build terakhir'}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: DOT_COLOR[status] }}
      />
      <span style={{ color: TEXT_COLOR[status] }} className="font-medium">
        {label}
      </span>
    </span>
  );
}
