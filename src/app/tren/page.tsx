'use client';

import { useMemo } from 'react';
import { getSampleTrendsData } from '@/lib/data-loader';
import TrendChart from '@/components/charts/TrendChart';
import EditorialPageShell from '@/components/layout/EditorialPageShell';

const COLORS = ['#507b6a', '#8d5a15', '#a33d2d', '#3366cc', '#6b4f2a'];

export default function TrenPage() {
  const trendsData = getSampleTrendsData();

  const mergedData = useMemo(() => {
    if (trendsData.length === 0) return [];
    const dateMap = new Map<string, Record<string, unknown>>();
    trendsData.forEach((series) => {
      series.data.forEach((point) => {
        const existing = dateMap.get(point.date) || { date: point.date };
        existing[series.keyword] = point.value;
        dateMap.set(point.date, existing);
      });
    });
    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    );
  }, [trendsData]);

  const trendSeries = trendsData.map((t, i) => ({
    keyword: t.keyword,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <EditorialPageShell
      eyebrow="Tren pencarian"
      title="Pembacaan cepat Google Trends"
      description="Seri kata kunci utama ketenagakerjaan untuk melihat denyut pencarian publik dalam beberapa bulan terakhir."
      summary={
        <div className="space-y-2">
          <div className="text-lg font-semibold text-[var(--app-text)]">{trendSeries.length} seri aktif</div>
          <p className="text-xs leading-5 text-[var(--app-muted)]">
            Menampilkan grup kata kunci utama tanpa panel regional tambahan.
          </p>
        </div>
      }
    >
      <section className="border border-[var(--app-border)] bg-[var(--app-surface)]">
        <div className="border-b border-[var(--app-border)] px-3 py-3">
          <h1 className="text-lg font-semibold text-[var(--app-text)]">Tren pencarian</h1>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Google Trends, Feb-Mei 2026.</p>
        </div>
        <div className="p-3">
          <TrendChart data={mergedData} xKey="date" series={trendSeries} height={380} />
        </div>
        <div className="border-t border-[var(--app-border)] px-3 py-2 text-xs text-[var(--app-subtle)]">
          Menampilkan seri utama kata kunci ketenagakerjaan tanpa panel regional dan grup kata kunci tambahan.
        </div>
      </section>
    </EditorialPageShell>
  );
}
