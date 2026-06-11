'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import LineChart from '@/components/charts/LineChart';
import StatCard from '@/components/cards/StatCard';
import type { BPSSDGSakernasFile } from '@/lib/data-loader-server';

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <h2 className="text-base font-semibold text-[var(--app-text)]">{title}</h2>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[var(--app-subtle)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--app-subtle)]" />
        )}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

function formatPercent(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return `${new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}%`;
}

function stripHtml(input: string) {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

interface SDGSakernasClientProps {
  sdgData: BPSSDGSakernasFile | null;
  historicalData: unknown[];
  tptTimelineData: unknown[];
  provinceTptData: unknown[];
}

export default function SDGSakernasClient({ sdgData }: SDGSakernasClientProps) {
  const availableIndicators = useMemo(() => sdgData?.included_indicators ?? [], [sdgData]);
  const metadataOnlyIndicators = useMemo(() => sdgData?.excluded_requested_indicators ?? [], [sdgData]);

  return (
    <div className="space-y-6">
      <section className="border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
        <div className="max-w-4xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-subtle)]">
            ASEAN + SDG
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">
            Kode 431, 552, dan 871
          </h1>
          <p className="text-sm leading-6 text-[var(--app-muted)]">
            Cakupan ASEAN pada dashboard ini sekarang mengikuti kondisi terbaru per <strong>26 Oktober 2025</strong>,
            ketika Timor-Leste resmi diterima sebagai anggota ASEAN ke-11. Untuk deret pembanding kawasan, sumber utama
            tetap World Bank karena paling panjang dan paling konsisten untuk TPT, TPAK, dan EPR.
          </p>
          <p className="text-sm leading-6 text-[var(--app-muted)]">
            Untuk menu SDG ini, tampilan disederhanakan agar hanya memuat tiga kode yang Anda minta: <strong>431</strong>,
            <strong> 552</strong>, dan <strong>871</strong>. Setiap entri diberi metadata sumber, catatan cakupan, dan status
            ketersediaan tabel/grafik.
          </p>
        </div>
      </section>

      {availableIndicators.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {availableIndicators.map((indicator) => (
            <StatCard
              key={indicator.requestedCode}
              title={`Kode ${indicator.requestedCode}`}
              value={formatPercent(indicator.latestValue)}
              subtitle={indicator.latestYear ? `${indicator.title}, ${indicator.latestYear}` : indicator.title}
              sparkData={indicator.years
                .filter((item) => item.value !== null)
                .map((item) => ({ value: Number(item.value) }))}
            />
          ))}
        </div>
      ) : null}

      {availableIndicators.map((indicator) => {
        const chartData = indicator.years.map((item) => ({
          year: item.year,
          value: item.value,
        }));
        const visibleBreakdown = indicator.latestBreakdown.slice(0, 15);

        return (
          <CollapsibleSection
            key={indicator.requestedCode}
            title={`Kode ${indicator.requestedCode} - ${indicator.title}`}
          >
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Nilai Terbaru"
                  value={formatPercent(indicator.latestValue)}
                  subtitle={indicator.latestYear ? `Nasional, ${indicator.latestYear}` : 'Nasional'}
                />
                <StatCard
                  title="Kode Resmi"
                  value={indicator.officialCode}
                  subtitle={`Var ${indicator.varId}`}
                />
                <StatCard
                  title="Subjek"
                  value={indicator.subject}
                  subtitle={indicator.unit || 'Tanpa satuan eksplisit'}
                />
                <StatCard
                  title="Pembaruan"
                  value={indicator.lastUpdate ?? 'N/A'}
                  subtitle={indicator.breakdownLabel}
                />
              </div>

              <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Metadata dan info</h3>
                <div className="grid gap-3 text-sm text-[var(--app-muted)] md:grid-cols-2">
                  <div>
                    <p className="font-medium text-[var(--app-text)]">Sumber</p>
                    <p>{stripHtml(indicator.sourceNote) || 'BPS Web API'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--app-text)]">Catatan interpretasi</p>
                    <p>{indicator.metadataNote}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Grafik nasional</h3>
                <LineChart
                  data={chartData}
                  xKey="year"
                  lines={[
                    {
                      dataKey: 'value',
                      label: `Kode ${indicator.requestedCode}`,
                      color: '#0D9488',
                    },
                  ]}
                  height={300}
                  valueFormatter={(value) => formatPercent(typeof value === 'number' ? value : Number(value))}
                />
              </div>

              <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Tabel rincian terbaru</h3>
                <div className="mb-3 text-xs text-[var(--app-subtle)]">
                  Menampilkan hingga 15 rincian teratas dari {indicator.breakdownLabel}.
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--app-border)] text-left text-[var(--app-subtle)]">
                        <th className="py-2 pr-4 font-medium">Rincian</th>
                        <th className="py-2 pr-4 font-medium">Kode</th>
                        <th className="py-2 font-medium">Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleBreakdown.map((item) => (
                        <tr key={`${indicator.requestedCode}-${item.code}`} className="border-b border-[var(--app-border)]">
                          <td className="py-2 pr-4 text-[var(--app-text)]">{item.label}</td>
                          <td className="py-2 pr-4 text-[var(--app-subtle)]">{item.code}</td>
                          <td className="py-2 font-medium text-[var(--app-text)]">{formatPercent(item.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        );
      })}

      {metadataOnlyIndicators.map((indicator) => (
        <CollapsibleSection
          key={indicator.requestedCode}
          title={`Kode ${indicator.requestedCode} - ${indicator.title}`}
          defaultOpen={false}
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <StatCard title="Status" value="Metadata only" subtitle="Belum ada deret tabel/grafik yang ditarik" />
              <StatCard title="Kode Resmi" value={indicator.officialCode} subtitle={indicator.source} />
              <StatCard title="Kode Diminta" value={indicator.requestedCode} subtitle="Permintaan pengguna" />
            </div>
            <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-4 text-sm text-[var(--app-muted)]">
              <p className="font-medium text-[var(--app-text)]">Catatan metadata</p>
              <p className="mt-2">{indicator.reason}</p>
            </div>
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}
