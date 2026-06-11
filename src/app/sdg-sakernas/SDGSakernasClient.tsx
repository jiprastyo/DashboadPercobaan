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
  historicalData: Array<{
    year: string;
    tpt: number;
    tpak: number;
  }>;
  tptTimelineData: unknown[];
  provinceTptData: unknown[];
}

export default function SDGSakernasClient({ sdgData, historicalData }: SDGSakernasClientProps) {
  const requestedOrder = useMemo(
    () => sdgData?.requested_codes ?? ['431', '552', '831', '852A', '852', '861', '871A', '871', '922'],
    [sdgData]
  );
  const availableIndicators = useMemo(() => {
    const items = sdgData?.included_indicators ?? [];
    return [...items].sort(
      (a, b) => requestedOrder.indexOf(a.requestedCode) - requestedOrder.indexOf(b.requestedCode)
    );
  }, [requestedOrder, sdgData]);
  const metadataOnlyIndicators = useMemo(() => {
    const items = sdgData?.excluded_requested_indicators ?? [];
    return [...items].sort(
      (a, b) => requestedOrder.indexOf(a.requestedCode) - requestedOrder.indexOf(b.requestedCode)
    );
  }, [requestedOrder, sdgData]);
  const benchmarkSeries = useMemo(() => {
    return [...historicalData]
      .map((point) => {
        const epr = Number((point.tpak * (1 - point.tpt / 100)).toFixed(2));
        return {
          year: point.year,
          tpt: point.tpt,
          tpak: point.tpak,
          epr,
        };
      })
      .sort((left, right) => Number(left.year) - Number(right.year));
  }, [historicalData]);
  const latestBenchmarkPoint = benchmarkSeries[benchmarkSeries.length - 1] ?? null;
  const benchmarkChartData = benchmarkSeries.map((point) => ({
    period: point.year,
    'TPAK (%)': point.tpak,
    'EPR (%)': point.epr,
    'TPT (%)': point.tpt,
  }));

  return (
    <div className="space-y-6">
      {benchmarkSeries.length > 0 && latestBenchmarkPoint ? (
        <CollapsibleSection title="Indikator SDG Ketenagakerjaan Berbasis Sakernas">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                title="SDG 8.5.2 - Tingkat Pengangguran"
                value={formatPercent(latestBenchmarkPoint.tpt, 2)}
                subtitle={`Benchmark BPS Sakernas ${latestBenchmarkPoint.year}`}
                sparkData={benchmarkSeries.map((point) => ({ value: point.tpt }))}
              />
              <StatCard
                title="TPAK Sakernas"
                value={formatPercent(latestBenchmarkPoint.tpak, 2)}
                subtitle={`Pendamping benchmark ${latestBenchmarkPoint.year}`}
                sparkData={benchmarkSeries.map((point) => ({ value: point.tpak }))}
              />
              <StatCard
                title="EPR Sakernas"
                value={formatPercent(latestBenchmarkPoint.epr, 2)}
                subtitle={`Turunan BPS Sakernas ${latestBenchmarkPoint.year}`}
                sparkData={benchmarkSeries.map((point) => ({ value: point.epr }))}
              />
            </div>

            <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Grafik benchmark BPS Sakernas</h3>
              <LineChart
                data={benchmarkChartData}
                xKey="period"
                lines={[
                  {
                    dataKey: 'TPAK (%)',
                    label: 'TPAK (%)',
                    color: '#0D9488',
                  },
                  {
                    dataKey: 'EPR (%)',
                    label: 'EPR (%)',
                    color: '#2563EB',
                  },
                  {
                    dataKey: 'TPT (%)',
                    label: 'TPT (%)',
                    color: '#DC2626',
                  },
                ]}
                height={320}
                valueFormatter={(value) => formatPercent(typeof value === 'number' ? value : Number(value))}
              />
            </div>

            <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-sm text-[var(--app-muted)]">
              <p className="font-medium text-[var(--app-text)]">Metadata benchmark</p>
              <p className="mt-2">
                Panel ini memindahkan indikator SDG ketenagakerjaan dari menu Makro Indonesia ke menu SDG agar seluruh
                pembacaan Sakernas terpusat di satu tempat. Benchmark utamanya tetap seri resmi BPS nasional, dengan
                <strong> SDG 8.5.2</strong> dipetakan ke TPT, <strong>TPAK</strong> sebagai indikator partisipasi, dan
                <strong> EPR</strong> dihitung sebagai <strong>TPAK x (1 - TPT)</strong>.
              </p>
            </div>
          </div>
        </CollapsibleSection>
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
                  <div>
                    <p className="font-medium text-[var(--app-text)]">Kode dan satuan</p>
                    <p>{indicator.officialCode} - Var {indicator.varId}{indicator.unit ? ` - ${indicator.unit}` : ''}</p>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--app-text)]">Pembaruan terakhir</p>
                    <p>{indicator.lastUpdate ?? 'N/A'}</p>
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
          <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-4 text-sm text-[var(--app-muted)]">
            <p className="font-medium text-[var(--app-text)]">Catatan metadata</p>
            <p className="mt-2">{indicator.reason}</p>
            <p className="mt-3">Kode resmi: <strong>{indicator.officialCode}</strong> - Sumber acuan: {indicator.source}</p>
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}
