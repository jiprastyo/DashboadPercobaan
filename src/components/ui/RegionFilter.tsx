'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import MultiSelectDropdown from './MultiSelectDropdown';
import { cn } from '@/lib/utils';

export interface RegionFilterOption {
  id: string;
  label: string;
  flagEmoji?: string;
  color?: string;
}

interface RegionFilterProps {
  /** Eyebrow label, e.g. "Provinsi" or "Negara". */
  label: string;
  /** Every selectable region. Order here defines the chip + dropdown order. */
  options: RegionFilterOption[];
  /** Currently selected region ids. */
  selected: string[];
  onChange: (next: string[]) => void;
  /** Full "select all" set, in the order the "Semua" action should apply it. */
  selectAllValue: string[];
  /** A chart is meaningless with no regions; the last removal below this is refused. */
  minSelected?: number;
  /** Optional per-id chip color (e.g. the line color used on the chart). */
  colorFor?: (id: string) => string | undefined;
  className?: string;
}

/**
 * Presentation-only per-chart region picker (provinces / countries). Owns no
 * state: each chart keeps its own selection array in the parent page, so two
 * charts on the same tab can show different regions at once.
 *
 * Two controls: a searchable multi-select plus a chip row of the current
 * selection with per-chip remove. Both funnel through `commit`, which
 * de-dupes, drops ids unknown to `options`, and refuses to fall below
 * `minSelected`.
 */
export default function RegionFilter({
  label,
  options,
  selected,
  onChange,
  selectAllValue,
  minSelected = 1,
  colorFor,
  className,
}: RegionFilterProps) {
  const optionById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options]
  );

  const dropdownOptions = useMemo(
    () => options.map((option) => ({
      id: option.id,
      label: option.flagEmoji ? `${option.flagEmoji} ${option.label}` : option.label,
      color: colorFor?.(option.id) ?? option.color,
    })),
    [colorFor, options]
  );

  // Keep the chip row in the caller's canonical option order, not click order.
  const orderedSelected = useMemo(() => {
    const order = new Map(options.map((option, index) => [option.id, index]));
    return [...new Set(selected)].sort(
      (a, b) => (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [options, selected]);

  const commit = (next: string[]) => {
    const allowed = new Set(options.map((option) => option.id));
    const deduped = Array.from(new Set(next.filter((id) => allowed.has(id))));

    if (deduped.length >= minSelected) {
      onChange(deduped);
      return;
    }

    // Never leave a chart with fewer than minSelected regions: top up from the
    // select-all order so the fallback is deterministic (national first).
    const toppedUp = [...deduped];
    for (const id of selectAllValue) {
      if (toppedUp.length >= minSelected) break;
      if (!toppedUp.includes(id) && allowed.has(id)) toppedUp.push(id);
    }
    onChange(toppedUp);
  };

  const isAllSelected =
    options.length > 0 && options.every((option) => orderedSelected.includes(option.id));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
          {label}
        </span>
        <div className="min-w-[200px] max-w-xs flex-1">
          <MultiSelectDropdown
            options={dropdownOptions}
            selected={orderedSelected}
            onChange={commit}
            placeholder={`Pilih ${label.toLowerCase()}`}
            headerActions={[
              {
                label: isAllSelected ? 'Semua dipilih' : 'Semua',
                onClick: () => commit(selectAllValue),
              },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {orderedSelected.map((id) => {
          const option = optionById.get(id);
          if (!option) return null;
          const color = colorFor?.(id) ?? option.color;
          const canRemove = orderedSelected.length > minSelected;

          return (
            <button
              key={id}
              type="button"
              onClick={() => commit(orderedSelected.filter((item) => item !== id))}
              disabled={!canRemove}
              title={canRemove ? 'Hapus' : 'Minimal satu wilayah harus aktif'}
              className="flex items-center space-x-1 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] shadow-xs transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              style={
                color
                  ? { borderColor: color, color, backgroundColor: `${color}10` }
                  : undefined
              }
            >
              {option.flagEmoji ? <span>{option.flagEmoji}</span> : null}
              <span>{option.label}</span>
              {canRemove ? <X className="h-3 w-3" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}