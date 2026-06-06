'use client';

import { useMemo } from 'react';
import { getSampleTrendsData } from '@/lib/data-loader';
import { TRENDS_KEYWORDS } from '@/lib/constants';
import TrendChart from '@/components/charts/TrendChart';
import Badge from '@/components/ui/Badge';

const COLORS = ['#0D9488', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];

export default function TrenPage() {
  const trendsData = getSampleTrendsData();

  // Merge all trends data into single dataset for the chart
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
    <div className="space-y-6">
      {/* Section: Tren Real-time (Node.js) */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Tren Real-time</h2>
          <p className="text-sm text-gray-500 mt-1">
            Data Google Trends dari scraper Node.js — periode Feb–Mei 2026.
          </p>
        </div>
        <TrendChart data={mergedData} xKey="date" series={trendSeries} height={380} />
      </div>

      {/* Section: Analisis Mendalam (Python) */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Analisis Mendalam</h2>
          <p className="text-sm text-gray-500 mt-1">
            Data Google Trends dari scraper Python (pytrends) — termasuk interest by region.
          </p>
        </div>
        {/* Regional heatmap placeholder */}
        <div className="border border-dashed border-gray-300 rounded-lg p-10 text-center bg-gray-50">
          <p className="text-gray-400 text-sm mb-2">
            📍 Peta Heatmap Regional — Segera Hadir
          </p>
          <p className="text-xs text-gray-400">
            Menampilkan peta Indonesia dengan intensitas pencarian per provinsi.
            <br />
            Data dari pytrends interest_by_region.
          </p>
        </div>
      </div>

      {/* Keyword Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(TRENDS_KEYWORDS).map(([group, keywords], gi) => (
          <div key={group} className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Grup Kata Kunci {gi + 1}
            </h3>
            <div className="space-y-2">
              {keywords.map((kw) => {
                const trend = trendsData.find((t) => t.keyword === kw);
                const latestValue = trend?.data[trend.data.length - 1]?.value;
                return (
                  <div
                    key={kw}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">{kw}</span>
                      {trend?.source && (
                        <Badge variant={trend.source === 'node' ? 'info' : 'warning'} size="sm">
                          {trend.source}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {latestValue !== undefined ? latestValue : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
            {trendsData.find((t) => keywords.includes(t.keyword))?.related_queries && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1.5">Kueri Terkait:</p>
                <div className="flex flex-wrap gap-1">
                  {trendsData
                    .filter((t) => keywords.includes(t.keyword))
                    .flatMap((t) => t.related_queries || [])
                    .slice(0, 5)
                    .map((q) => (
                      <span
                        key={q}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-md"
                      >
                        {q}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
