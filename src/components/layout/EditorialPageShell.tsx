import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EditorialPageShellProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  summary?: ReactNode;
  sidebar?: ReactNode;
  showSidebar?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

interface EditorialSidebarSectionProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export default function EditorialPageShell({
  sidebar,
  showSidebar = false,
  children,
  className,
  contentClassName,
}: EditorialPageShellProps) {
  const hasSidebar = Boolean(sidebar && showSidebar);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          hasSidebar ? 'grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]' : 'space-y-4',
          className
        )}
      >
        {hasSidebar ? <aside className="min-w-0 space-y-4 xl:sticky xl:top-28 xl:self-start">{sidebar}</aside> : null}

        <div className={cn('min-w-0 space-y-4', contentClassName)}>{children}</div>
      </div>
    </div>
  );
}

export function EditorialSidebarSection({
  title,
  children,
  className,
  defaultOpen = true,
}: EditorialSidebarSectionProps) {
  return (
    <details className={cn('overflow-visible border border-[var(--app-border)] bg-[var(--app-surface)]', className)} open={defaultOpen}>
      <summary className="cursor-pointer border-b border-[var(--app-border)] px-4 py-3 text-sm font-semibold text-[var(--app-text)] marker:text-[var(--app-subtle)]">
        {title}
      </summary>
      <div className="space-y-4 p-4">{children}</div>
    </details>
  );
}
