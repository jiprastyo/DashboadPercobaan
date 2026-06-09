'use client';

import { cn } from '@/lib/utils';

interface FilterOption {
  id: string;
  label: string;
  color?: string;
}

interface FilterGroupProps {
  label?: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export default function FilterGroup({
  label,
  options,
  selected,
  onChange,
  className,
}: FilterGroupProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const allSelected = selected.length === 0;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <span className="text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onChange([])}
          className={cn(
            'border px-2.5 py-1.5 text-xs transition-colors cursor-pointer',
            allSelected
              ? 'border-[var(--app-link)] bg-[var(--app-bg-soft)] text-[var(--app-text)]'
              : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)]'
          )}
        >
          Semua
        </button>
        {options.map((opt) => {
          const isActive = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={cn(
                'border px-2.5 py-1.5 text-xs transition-colors cursor-pointer',
                isActive
                  ? 'border-[var(--app-link)] bg-[var(--app-bg-soft)] text-[var(--app-text)]'
                  : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)]'
              )}
              style={
                isActive && opt.color
                  ? { borderColor: opt.color, boxShadow: `inset 3px 0 0 ${opt.color}` }
                  : undefined
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
