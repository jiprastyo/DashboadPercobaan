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
          className="inline-flex items-center gap-1.5 border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:border-red-400 hover:bg-red-100"
        >
          <span>{item.label}</span>
          <X className="h-3.5 w-3.5" />
        </button>
      ))}

      {items.length > 1 && onResetAll ? (
        <button
          type="button"
          onClick={onResetAll}
          className="inline-flex items-center border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:border-red-400 hover:bg-red-50"
        >
          Reset semua filter
        </button>
      ) : null}
    </div>
  );
}
