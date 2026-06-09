import { cn, formatRelativeTime } from '@/lib/utils';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { SourceMetadata } from '@/types';

interface SourceStatusCardProps {
  source: SourceMetadata;
  className?: string;
}

const statusConfig = {
  ok: {
    icon: CheckCircle,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    label: 'OK',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    label: 'Peringatan',
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    label: 'Error',
  },
};

export default function SourceStatusCard({ source, className }: SourceStatusCardProps) {
  const config = statusConfig[source.status];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-3 py-2.5', className)}>
      <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[var(--app-border)]', config.bg)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-[var(--app-text)]">
            {source.source}
          </span>
          <span className="flex-shrink-0 text-xs text-[var(--app-subtle)]">
            {source.items_total} item
          </span>
        </div>
        <p className="text-xs text-[var(--app-muted)]">
          {formatRelativeTime(source.last_success)}
        </p>
      </div>
    </div>
  );
}
