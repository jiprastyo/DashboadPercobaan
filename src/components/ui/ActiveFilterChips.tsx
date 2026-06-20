'use client';

import CompactChip from './CompactChip';

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
        <CompactChip
          key={item.id}
          onRemove={item.onRemove}
        >
          {item.label}
        </CompactChip>
      ))}

      {items.length > 1 && onResetAll ? (
        <CompactChip onClick={onResetAll}>
          Reset semua filter
        </CompactChip>
      ) : null}
    </div>
  );
}
