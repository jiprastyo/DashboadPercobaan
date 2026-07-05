'use client';

import { Download } from 'lucide-react';
import { downloadCsv } from '@/lib/csv-export';

interface CsvDownloadButtonProps {
  /** Filename WITHOUT extension, e.g. `tpt-nasional-makro-indonesia-2026-07-05`. */
  filename: string;
  /** The exact rows array the chart/table currently renders (filtered charts
   * export filtered rows -- what you see is what you export). */
  rows: Record<string, unknown>[];
  className?: string;
}

/** Per-chart CSV export button (Stage 3.1). Vanilla client-side download,
 * no export library. Hidden from print output; keyboard-focusable like
 * every other interactive control in the app. */
export default function CsvDownloadButton({ filename, rows, className }: CsvDownloadButtonProps) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(`${filename}.csv`, rows)}
      disabled={rows.length === 0}
      className={`no-print inline-flex items-center gap-1.5 border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-surface-raised)] focus-visible:app-focus disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ''}`}
      title={rows.length === 0 ? 'Tidak ada data untuk diunduh' : 'Unduh data grafik ini sebagai CSV'}
    >
      <Download className="h-3 w-3 shrink-0" />
      <span>Unduh CSV</span>
    </button>
  );
}
