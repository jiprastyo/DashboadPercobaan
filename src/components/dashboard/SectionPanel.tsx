import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionPanelProps {
  title: string;
  eyebrow?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function SectionPanel({
  title,
  eyebrow,
  sourceLabel,
  sourceUrl,
  action,
  children,
  className,
  contentClassName,
}: SectionPanelProps) {
  return (
    <section className={cn('border border-[var(--app-border)] bg-[var(--app-surface)]', className)}>
      <div className="flex min-w-0 flex-col gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-subtle)]">
              {eyebrow}
            </p>
          )}
          <h2 className="truncate text-sm font-extrabold text-[var(--app-text)]">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {sourceLabel && sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--app-link)] hover:underline focus-visible:app-focus"
            >
              <span className="max-w-[180px] truncate">{sourceLabel}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          )}
          {action}
        </div>
      </div>
      <div className={cn('min-w-0 p-3', contentClassName)}>{children}</div>
    </section>
  );
}
