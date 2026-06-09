'use client';

import { useMemo } from 'react';
import { getSampleTrendsData } from '@/lib/data-loader';
import { TRENDS_KEYWORDS } from '@/lib/constants';
import TrendChart from '@/components/charts/TrendChart';
import Badge from '@/components/ui/Badge';

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
    <div className="space-y-4">
      <section className="border border-[var(--app-border)] bg-[var(--app-surface)]">
        <div className="border-b border-[var(--app-border)] px-3 py-3">
          <h1 className="text-lg font-semibold text-[var(--app-text)]">Tren pencarian</h1>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Google Trends, Feb-Mei 2026.</p>
        </div>
        <div className="p-3">
          <TrendChart data={mergedData} xKey="date" series={trendSeries} height={380} />
        </div>
      </section>

      <section className="border border-[var(--app-border)] bg-[var(--app-surface)]">
        <div className="border-b border-[var(--app-border)] px-3 py-3">
          <h2 className="text-base font-semibold text-[var(--app-text)]">Analisis regional</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Data pytrends dan interest by region.</p>
        </div>
        <div className="m-3 border border-dashed border-[var(--app-border)] bg-[var(--app-bg-soft)] p-10 text-center">
          <p className="mb-2 text-sm text-[var(--app-muted)]">Peta heatmap regional</p>
          <p className="text-xs text-[var(--app-subtle)]">
            Tampilan provinsi dan intensitas pencarian belum diaktifkan.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Object.entries(TRENDS_KEYWORDS).map(([group, keywords], gi) => (
          <section key={group} className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Grup kata kunci {gi + 1}</h3>
            <div className="space-y-2">
              {keywords.map((kw) => {
                const trend = trendsData.find((t) => t.keyword === kw);
                const latestValue = trend?.data[trend.data.length - 1]?.value;
                return (
                  <div
                    key={kw}
                    className="flex items-center justify-between border-b border-[var(--app-border)] py-2 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--app-text)]">{kw}</span>
                      {trend?.source ? (
                        <Badge variant={trend.source === 'node' ? 'info' : 'warning'} size="sm">
                          {trend.source}
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-sm font-medium text-[var(--app-text)]">
                      {latestValue !== undefined ? latestValue : '-'}
                    </span>
                  </div>
                );
              })}
            </div>

            {trendsData.find((t) => keywords.includes(t.keyword))?.related_queries ? (
              <div className="mt-3 border-t border-[var(--app-border)] pt-3">
                <p className="mb-1.5 text-xs text-[var(--app-subtle)]">Kueri terkait</p>
                <div className="flex flex-wrap gap-1">
                  {trendsData
                    .filter((t) => keywords.includes(t.keyword))
                    .flatMap((t) => t.related_queries || [])
                    .slice(0, 5)
                    .map((q) => (
                      <span
                        key={q}
                        className="border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-2 py-0.5 text-xs text-[var(--app-muted)]"
                      >
                        {q}
                      </span>
                    ))}
                </div>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
