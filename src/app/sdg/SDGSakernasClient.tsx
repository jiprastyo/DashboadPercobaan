'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Table, TrendingUp } from 'lucide-react';
import LineChart from '@/components/charts/LineChart';
import StatCard from '@/components/cards/StatCard';
import EditorialPageShell from '@/components/layout/EditorialPageShell';
import type { BPSSDGSakernasFile } from '@/lib/data-loader-server';
import CompactChip from '@/components/ui/CompactChip';

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
}

export default function SDGSakernasClient({ sdgData, historicalData }: SDGSakernasClientProps) {
  const [benchmarkView, setBenchmarkView] = useState<'chart' | 'table'>('chart');
  const [indicatorViews, setIndicatorViews] = useState<Record<string, 'chart' | 'table'>>({});
  const [selectedBenchmarkMetrics, setSelectedBenchmarkMetrics] = useState<string[]>(['TPAK (%)', 'EPR (%)', 'TPT (%)']);
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
  const lastGenerated = sdgData?._generated_at
    ? new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(sdgData._generated_at))
    : null;
  const benchmarkLines = [
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
  ].filter((line) => selectedBenchmarkMetrics.includes(line.dataKey));
  const toggleBenchmarkMetric = (metric: string) => {
    setSelectedBenchmarkMetrics((current) => {
      if (current.includes(metric)) {
        return current.length > 1 ? current.filter((item) => item !== metric) : current;
      }
      return [...current, metric];
    });
  };

  return (
    <EditorialPageShell
      eyebrow="SDG"
      title="Indikator SDG ketenagakerjaan"
      description="Panel benchmark Sakernas dan indikator SDG ketenagakerjaan yang dibaca langsung dari BPS Web API tanpa sidebar navigasi tambahan."
      summary={
        <div className="space-y-2">
          <div className="text-lg font-semibold text-[var(--app-text)]">{availableIndicators.length} indikator aktif</div>
          <p className="text-xs leading-5 text-[var(--app-muted)]">
            {metadataOnlyIndicators.length} indikator metadata-only. Pembaruan lokal terakhir: {lastGenerated ?? 'N/A'}.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        {benchmarkSeries.length > 0 && latestBenchmarkPoint ? (
        <CollapsibleSection title="Kode 852 / Indikator SDG Ketenagakerjaan Berbasis Sakernas">
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
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-sm font-semibold text-[var(--app-text)]">Benchmark BPS Sakernas</h3>
                <div className="flex w-full max-w-xs space-x-1 bg-[var(--app-border)]/30 p-1">
                  <button onClick={() => setBenchmarkView('chart')} className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold ${benchmarkView === 'chart' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)]'}`}><TrendingUp className="h-3.5 w-3.5" />Grafik</button>
                  <button onClick={() => setBenchmarkView('table')} className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold ${benchmarkView === 'table' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)]'}`}><Table className="h-3.5 w-3.5" />Tabel</button>
                </div>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {['TPAK (%)', 'EPR (%)', 'TPT (%)'].map((metric) => (
                  <CompactChip key={metric} active={selectedBenchmarkMetrics.includes(metric)} onClick={() => toggleBenchmarkMetric(metric)}>
                    {metric}
                  </CompactChip>
                ))}
              </div>
              {benchmarkView === 'chart' ? (
                <LineChart
                  data={benchmarkChartData}
                  xKey="period"
                  lines={benchmarkLines}
                  height={360}
                  valueFormatter={(value) => formatPercent(typeof value === 'number' ? value : Number(value))}
                />
              ) : (
                <div className="overflow-x-auto border border-[var(--app-border)] bg-[var(--app-surface)]">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead><tr className="border-b border-[var(--app-border)] text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]"><th className="px-3 py-2 text-left">Tahun</th><th className="px-3 py-2 text-right">TPAK</th><th className="px-3 py-2 text-right">EPR</th><th className="px-3 py-2 text-right">TPT</th></tr></thead>
                    <tbody className="divide-y divide-[var(--app-border)]">{benchmarkChartData.map((row) => (<tr key={row.period}><td className="px-3 py-2">{row.period}</td><td className="px-3 py-2 text-right">{formatPercent(Number(row['TPAK (%)']))}</td><td className="px-3 py-2 text-right">{formatPercent(Number(row['EPR (%)']))}</td><td className="px-3 py-2 text-right">{formatPercent(Number(row['TPT (%)']))}</td></tr>))}</tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-sm text-[var(--app-muted)]">
              <p className="font-medium text-[var(--app-text)]">Metadata benchmark</p>
              <p className="mt-2">
                Panel ini memindahkan indikator SDG ketenagakerjaan dari menu Makro Indonesia ke menu SDG agar seluruh
                pembacaan Sakernas terpusat di satu tempat. Benchmark utamanya tetap seri resmi BPS nasional, dengan
                <strong> SDG 8.5.2</strong> dipetakan ke TPT, <strong>TPAK</strong> sebagai indikator partisipasi, dan
                <strong> EPR</strong> dihitung sebagai <strong>TPAK x (1 - TPT)</strong>.
              </p>
              <p className="mt-2">
                Sumber panel ini tetap <strong>BPS Web API / Sakernas</strong>. Tidak ada seri World Bank, UNSD, Bappenas,
                Satu Data, atau Katadata yang dicampurkan ke benchmark utama halaman SDG.
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
        const activeIndicatorView = indicatorViews[indicator.requestedCode] || 'chart';

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
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-sm font-semibold text-[var(--app-text)]">Grafik dan tabel indikator</h3>
                  <div className="flex w-full max-w-xs space-x-1 bg-[var(--app-border)]/30 p-1">
                    <button onClick={() => setIndicatorViews((current) => ({ ...current, [indicator.requestedCode]: 'chart' }))} className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold ${activeIndicatorView === 'chart' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)]'}`}><TrendingUp className="h-3.5 w-3.5" />Grafik</button>
                    <button onClick={() => setIndicatorViews((current) => ({ ...current, [indicator.requestedCode]: 'table' }))} className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold ${activeIndicatorView === 'table' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)]'}`}><Table className="h-3.5 w-3.5" />Tabel</button>
                  </div>
                </div>
                {activeIndicatorView === 'chart' ? (
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
                    height={340}
                    valueFormatter={(value) => formatPercent(typeof value === 'number' ? value : Number(value))}
                  />
                ) : (
                  <div className="overflow-x-auto border border-[var(--app-border)] bg-[var(--app-surface)]">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b border-[var(--app-border)] text-left text-[var(--app-subtle)]">
                          <th className="px-3 py-2 font-medium">Rincian</th>
                          <th className="px-3 py-2 font-medium">Kode</th>
                          <th className="px-3 py-2 text-right font-medium">Nilai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--app-border)]">
                        {visibleBreakdown.map((item) => (
                          <tr key={`${indicator.requestedCode}-${item.code}`}>
                            <td className="px-3 py-2 text-[var(--app-text)]">{item.label}</td>
                            <td className="px-3 py-2 text-[var(--app-subtle)]">{item.code}</td>
                            <td className="px-3 py-2 text-right font-medium text-[var(--app-text)]">{formatPercent(item.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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

        <section className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-5 text-sm text-[var(--app-muted)]">
          <h2 className="text-base font-semibold text-[var(--app-text)]">Catatan sumber lain dan keterbatasannya</h2>
          <div className="mt-3 space-y-3">
            <p>
              Menu SDG ini sekarang menggunakan <strong>BPS Web API secara eksklusif</strong> untuk indikator, metadata, dan
              benchmark utama. Pembaruan lokal terakhir file SDG: {lastGenerated ?? 'N/A'}.
            </p>
            <p>
              <strong>UNSD</strong> resmi untuk pelaporan SDG global, tetapi untuk indikator tenaga kerja Indonesia yang kami
              cek pada <strong>11 Juni 2026</strong>, deret yang terbaca hanya sekitar <strong>2000-2023</strong>, sehingga
              lebih pendek dan lebih lambat daripada seri BPS.
            </p>
            <p>
              Berdasarkan daftar tabel Web API BPS yang kami cocokkan ulang, sebagian besar kode yang Anda minta ternyata
              memang tersedia di BPS dan sekarang sudah dipetakan langsung ke halaman ini. Pengecualian utamanya adalah
              <strong> 852</strong> dan <strong>852A</strong>, karena struktur tabel penganggurannya lebih cocok dibaca melalui
              panel benchmark Sakernas daripada dijadikan kartu seri SDG terpisah yang sepenuhnya sebanding.
            </p>
            <p>
              <strong>World Bank modeled ILO</strong> berguna untuk perbandingan lintas negara, tetapi definisinya adalah seri
              harmonisasi internasional. Karena itu nilainya bisa berbeda dari rilis resmi BPS Sakernas dan tidak dipakai
              sebagai benchmark utama di halaman ini.
            </p>
            <p>
              <strong>Bappenas</strong> dan <strong>Satu Data Indonesia</strong> berguna sebagai portal pelaporan atau katalog,
              tetapi bukan pemilik metodologi utama seri tenaga kerja. Untuk benchmark Indonesia, jalur langsung BPS tetap
              lebih kuat.
            </p>
            <p>
              <strong>Katadata</strong> dan agregator media/data lain bersifat sekunder. Mereka bisa membantu narasi atau
              visual, tetapi tidak dipakai sebagai sumber dasar indikator SDG di dashboard ini.
            </p>
          </div>
        </section>
      </div>
    </EditorialPageShell>
  );
}
