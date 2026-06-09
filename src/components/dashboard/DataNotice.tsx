import { AlertTriangle } from 'lucide-react';

interface DataNoticeProps {
  bpsSource: string;
  tptSource: string;
}

export default function DataNotice({ bpsSource, tptSource }: DataNoticeProps) {
  return (
    <div className="border-l-4 border-[var(--app-warning)] bg-[var(--app-surface)] px-3 py-3 text-sm text-[var(--app-muted)]">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-warning)]" />
        <div className="min-w-0">
          <p className="font-bold text-[var(--app-text)]">Sumber data cadangan aktif</p>
          <div className="mt-1 space-y-1 text-xs leading-relaxed">
            {bpsSource === 'static_seed' && (
              <p>Indikator nasional memakai cadangan statis lokal karena sumber BPS tidak tersedia saat data disusun.</p>
            )}
            {tptSource === 'fallback_spreadsheet' && (
              <p>TPT nasional/provinsi memakai spreadsheet cadangan karena API BPS tidak tersedia saat data disusun.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
