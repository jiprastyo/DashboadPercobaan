'use client';

import { X } from 'lucide-react';

interface ActiveFilterChipItem {
  id: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  items: ActiveFilterChipItem[];
  onResetAll?: () => void;
}

export default function ActiveFilterChips({ items, onResetAll }: ActiveFilterChipsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onRemove}
          className="inline-flex cursor-pointer items-center gap-1 border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-raised)]"
        >
          <span>{item.label}</span>
          <X className="h-3 w-3" />
        </button>
      ))}

      {items.length > 1 && onResetAll ? (
        <button
          type="button"
          onClick={onResetAll}
          className="inline-flex cursor-pointer items-center border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-raised)]"
        >
          Reset semua filter
        </button>
      ) : null}
    </div>
  );
}
