'use client';

import { useMemo, useState } from 'react';
import { Table, TrendingUp } from 'lucide-react';
import TrendChart from '@/components/charts/TrendChart';
import EditorialPageShell from '@/components/layout/EditorialPageShell';
import CompactChip from '@/components/ui/CompactChip';
import CsvDownloadButton from '@/components/ui/CsvDownloadButton';
import { csvDateStamp } from '@/lib/csv-export';
import { formatNumber } from '@/lib/utils';
import SourceFreshnessBadge from '@/components/ui/SourceFreshnessBadge';
import type { SourceFreshness } from '@/lib/data-loader-server';

export interface TrendSeries {
  keyword: string;
  averageInterest: number;
  regionalInterest: Record<string, number>;
  scrapedAt: string;
  data: Array<{
    date: string;
    label: string;
    value: number;
  }>;
}

interface TrenClientProps {
  sourceLabel: string;
  initialSeries: TrendSeries[];
  freshness: SourceFreshness;
}

const COLORS = ['#507b6a', '#8d5a15', '#a33d2d', '#3366cc', '#6b4f2a', '#2f6b4f', '#a33d2d', '#72777d'];
const INDONESIA_TOTAL = 'Indonesia total';

export default function TrenClient({ sourceLabel, initialSeries, freshness }: TrenClientProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(() =>
    initialSeries.slice(0, Math.min(5, initialSeries.length)).map((series) => series.keyword)
  );
  const [selectedRegion, setSelectedRegion] = useState(INDONESIA_TOTAL);
  const [activeView, setActiveView] = useState<'chart' | 'table'>('chart');
  const csvDate = useMemo(() => csvDateStamp(), []);

  const availableRegions = useMemo(() => {
    const regions = new Set<string>();
    initialSeries.forEach((series) => {
      Object.keys(series.regionalInterest || {}).forEach((region) => regions.add(region));
    });
    return [INDONESIA_TOTAL, ...Array.from(regions).sort()];
  }, [initialSeries]);

  const activeSeries = useMemo(
    () => initialSeries.filter((series) => selectedKeywords.includes(series.keyword)),
    [initialSeries, selectedKeywords]
  );

  const mergedData = useMemo(() => {
    const dateMap = new Map<string, Record<string, unknown>>();
    activeSeries.forEach((series) => {
      const regionScale =
        selectedRegion === INDONESIA_TOTAL
          ? 1
          : Number(series.regionalInterest?.[selectedRegion] ?? 0) / 100;
      series.data.forEach((point) => {
        const existing = dateMap.get(point.date) || { date: point.date, label: point.label };
        existing[series.keyword] = selectedRegion === INDONESIA_TOTAL ? point.value : Math.round(point.value * regionScale);
        dateMap.set(point.date, existing);
      });
    });
    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    );
  }, [activeSeries, selectedRegion]);

  const tableRows = useMemo(() => {
    return mergedData.flatMap((row) =>
      activeSeries.map((series) => ({
        date: String(row.label || row.date),
        keyword: series.keyword,
        region: selectedRegion,
        value: Number(row[series.keyword] ?? 0),
      }))
    );
  }, [activeSeries, mergedData, selectedRegion]);

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords((current) => {
      if (current.includes(keyword)) {
        return current.length > 1 ? current.filter((item) => item !== keyword) : current;
      }
      return [...current, keyword];
    });
  };

  return (
    <EditorialPageShell
    >
      <section className="border border-[var(--app-border)] bg-[var(--app-surface)]">
        <div className="space-y-3 border-b border-[var(--app-border)] px-3 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-[var(--app-text)]">Tren pencarian</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--app-muted)]">
                <span>Google Trends, artefak tersimpan {sourceLabel}.</span>
                <SourceFreshnessBadge status={freshness.status} lastFetch={freshness.lastFetch} reason={freshness.reason} />
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CsvDownloadButton filename={`tren-pencarian-tren-${csvDate}`} rows={tableRows} source={{ label: 'Google Trends', url: 'https://trends.google.com/trends/' }} />
              <div className="flex w-full max-w-xs space-x-1 bg-[var(--app-border)]/30 p-1">
              <button
                type="button"
                onClick={() => setActiveView('chart')}
                className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold ${activeView === 'chart' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)]'}`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Grafik
              </button>
              <button
                type="button"
                onClick={() => setActiveView('table')}
                className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold ${activeView === 'table' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)]'}`}
              >
                <Table className="h-3.5 w-3.5" />
                Tabel
              </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">Kata kunci</div>
            <div className="flex flex-wrap gap-1.5">
              {initialSeries.map((series) => (
                <CompactChip
                  key={series.keyword}
                  active={selectedKeywords.includes(series.keyword)}
                  onClick={() => toggleKeyword(series.keyword)}
                >
                  {series.keyword}
                </CompactChip>
              ))}
            </div>
          </div>

          {availableRegions.length > 1 ? (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">Wilayah</div>
              <div className="flex flex-wrap gap-1.5">
                {availableRegions.map((region) => (
                  <CompactChip key={region} active={selectedRegion === region} onClick={() => setSelectedRegion(region)}>
                    {region}
                  </CompactChip>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {activeView === 'chart' ? (
          <div className="p-3">
            <TrendChart
              data={mergedData}
              xKey="label"
              series={activeSeries.map((series, index) => ({
                keyword: series.keyword,
                color: COLORS[index % COLORS.length],
              }))}
              height={420}
            />
          </div>
        ) : (
          <div className="overflow-x-auto p-3">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)] text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">
                  <th className="px-3 py-2">Periode</th>
                  <th className="px-3 py-2">Kata kunci</th>
                  <th className="px-3 py-2">Wilayah</th>
                  <th className="px-3 py-2 text-right">Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {tableRows.map((row) => (
                  <tr key={`${row.date}-${row.keyword}-${row.region}`} className="hover:bg-[var(--app-bg-soft)]">
                    <td className="px-3 py-2 text-[var(--app-text)]">{row.date}</td>
                    <td className="px-3 py-2 text-[var(--app-muted)]">{row.keyword}</td>
                    <td className="px-3 py-2 text-[var(--app-muted)]">{row.region}</td>
                    <td className="px-3 py-2 text-right font-medium text-[var(--app-text)]">{formatNumber(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-[var(--app-border)] px-3 py-2 text-xs text-[var(--app-subtle)]">
          Wilayah provinsi muncul ketika artefak Google Trends menyertakan regional interest. Tanpa itu, tampilan memakai Indonesia total.
        </div>
      </section>
    </EditorialPageShell>
  );
}
