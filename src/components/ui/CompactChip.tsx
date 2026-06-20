'use client';

import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const compactChipClassName =
  'app-compact-chip focus-visible:app-focus';

interface CompactChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function CompactChip({
  children,
  active = false,
  onClick,
  onRemove,
  className,
  title,
  type = 'button',
}: CompactChipProps) {
  const content = (
    <>
      {active ? <Check className="h-3 w-3 shrink-0" /> : null}
      <span>{children}</span>
      {onRemove ? <X className="h-3 w-3 shrink-0" /> : null}
    </>
  );

  const chipClassName = cn(
    compactChipClassName,
    className
  );

  if (onClick || onRemove) {
    return (
      <button
        type={type}
        onClick={onRemove || onClick}
        className={chipClassName}
        title={title}
        data-active={active ? 'true' : 'false'}
        data-clickable="true"
      >
        {content}
      </button>
    );
  }

  return (
    <span className={chipClassName} title={title} data-active={active ? 'true' : 'false'} data-clickable="false">
      {content}
    </span>
  );
}
