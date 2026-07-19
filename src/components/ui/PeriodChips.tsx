'use client';

import CompactChip from './CompactChip';

interface PeriodChipsQuickAction {
  label: string;
  onClick: () => void;
}

interface PeriodChipsProps {
  /** Eyebrow label preceding the chips, e.g. "Tahun" or "Periode". Pass
   * `null` to omit the inline label span entirely, for call sites that
   * already render their own label above the chip row (preserves the
   * pre-refactor markup exactly -- zero UI diff). */
  label: string | null;
  /** Optional quick-select chips shown before the per-option chips, e.g.
   * "Semua tahun" / "12 tahun terbaru". Omit to render only the toggle
   * chips (e.g. the year row inside the TPT grid view). */
  quickActions?: PeriodChipsQuickAction[];
  /** The individual year/period values to render as toggle chips. Omit (or
   * pass an empty array) to render only the quick-action row. */
  options?: string[];
  /** Required only when `options` is non-empty. */
  isActive?: (option: string) => boolean;
  /** Required only when `options` is non-empty. */
  onToggle?: (option: string) => void;
  className?: string;
  /** Set false to omit `items-center` on the wrapper, matching call sites
   * that never had it (SDG's metric chips). Defaults to true. */
  alignItemsCenter?: boolean;
}

/**
 * Shared year/period chip row (Stage 3.2). Wraps the CompactChip UI used
 * identically across MakroIndonesia, MakroASEAN, and SDG's period/year
 * selectors. This component is presentation-only: each page keeps owning
 * its own selection state and the useMemo/useEffect "restore on empty
 * selection" pattern -- no global state or context for periods.
 */
export default function PeriodChips({
  label,
  quickActions,
  options,
  isActive,
  onToggle,
  className,
  alignItemsCenter = true,
}: PeriodChipsProps) {
  return (
    <div className={`flex flex-wrap ${alignItemsCenter ? 'items-center' : ''} gap-1.5 ${className ?? ''}`}>
      {label !== null && (
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
          {label}
        </span>
      )}
      {quickActions?.map((action) => (
        <CompactChip key={action.label} onClick={action.onClick}>
          {action.label}
        </CompactChip>
      ))}
      {options?.map((option) => (
        <CompactChip key={option} active={isActive?.(option) ?? false} onClick={() => onToggle?.(option)}>
          {option}
        </CompactChip>
      ))}
    </div>
  );
}
