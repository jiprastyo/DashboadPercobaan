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
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', config.bg)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-700 truncate">
            {source.source}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {source.items_total} item
          </span>
        </div>
        <p className="text-xs text-gray-400">
          {formatRelativeTime(source.last_success)}
        </p>
      </div>
    </div>
  );
}
