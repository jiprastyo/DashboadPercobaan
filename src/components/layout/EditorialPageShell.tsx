import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EditorialPageShellProps {
  sidebar?: ReactNode;
  showSidebar?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
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
