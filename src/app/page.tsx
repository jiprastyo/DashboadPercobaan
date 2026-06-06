'use client';

import { getSampleBPSData, getSamplePMIData, getSamplePHKData, getSampleNewsData, getSampleMetadata, getSampleSummaries } from '@/lib/data-loader';
import { formatNumber, formatPercent, getImpactBadge } from '@/lib/utils';
import StatCard from '@/components/cards/StatCard';
import NewsCard from '@/components/cards/NewsCard';
import SourceStatusCard from '@/components/cards/SourceStatusCard';
import { NEWS_SOURCES } from '@/lib/constants';
import { TrendingUp, DollarSign, Users, BarChart3 } from 'lucide-react';

export default function IkhtisarPage() {
  const bpsData = getSampleBPSData();
  const pmiData = getSamplePMIData();
  const phkData = getSamplePHKData();
  const newsData = getSampleNewsData();
  const metadata = getSampleMetadata();
  const summaries = getSampleSummaries();

  // Extract latest values
  const latestIHK = bpsData.find((d) => d.indicator === 'ihk');
  const latestPMI = pmiData[0];
  const latestPHK = phkData[0];
  const tpt = 4.82; // From ASEAN sample data

  // Sparkline data for IHK
  const ihkSpark = bpsData
    .filter((d) => d.indicator === 'ihk')
    .reverse()
    .map((d) => ({ value: d.value || 0 }));

  // Sparkline data for PMI
  const pmiSpark = pmiData
    .slice()
    .reverse()
    .map((d) => ({ value: d.pmi_value }));

  // Latest 5 news
  const latestNews = newsData.slice(0, 5);

  // Source status entries
  const sourceEntries = Object.values(metadata.sources);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="IHK (Inflasi MtM)"
          value={latestIHK?.value ? formatNumber(latestIHK.value, 2) : '-'}
          subtitle={latestIHK?.period}
          change={
            latestIHK?.change_mom !== undefined
              ? {
                  value: latestIHK.change_mom,
                  label: `${latestIHK.change_mom > 0 ? '+' : ''}${formatPercent(latestIHK.change_mom)} MtM`,
                  direction: latestIHK.change_mom > 0 ? 'up' : latestIHK.change_mom < 0 ? 'down' : 'neutral',
                }
              : undefined
          }
          sparkData={ihkSpark}
          sparkColor="#F59E0B"
          sourceUrl={latestIHK?._source_url || "https://www.bps.go.id/id/pressrelease"}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          title="PMI Manufaktur"
          value={formatNumber(latestPMI.pmi_value, 1)}
          subtitle={latestPMI.period}
          change={{
            value: latestPMI.pmi_value - 50,
            label: latestPMI.pmi_value > 50 ? 'Ekspansi' : 'Kontraksi',
            direction: latestPMI.pmi_value > 50 ? 'up' : 'down',
          }}
          sparkData={pmiSpark}
          sparkColor={latestPMI.pmi_value >= 50 ? '#10B981' : '#EF4444'}
          sourceUrl={latestPMI._source_url || "https://www.bi.go.id"}
          icon={<BarChart3 className="w-4 h-4" />}
        />
        <StatCard
          title="PHK Terkini"
          value={latestPHK?.workers_affected ? formatNumber(latestPHK.workers_affected) : '-'}
          subtitle="Jan–Mei 2026 (kumulatif)"
          change={{
            value: -1,
            label: `${phkData.length} laporan`,
            direction: 'down',
          }}
          sourceUrl={latestPHK?._source_url || "https://kemnaker.go.id"}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="TPT (Pengangguran)"
          value={formatPercent(tpt)}
          subtitle="Februari 2026"
          change={{
            value: -0.12,
            label: '-0,12 pp YoY',
            direction: 'up',
          }}
          sourceUrl="https://www.bps.go.id"
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Main Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Berita Terkini</h2>
            <a href="/berita" className="text-sm text-[#0D9488] hover:text-[#14B8A6] font-medium">
              Lihat Semua →
            </a>
          </div>
          <div className="space-y-3">
            {latestNews.map((article) => {
              const sourceInfo = NEWS_SOURCES.find((s) => s.id === article.source);
              const summary = summaries.find((s) => s.article_id === article.id);
              const impact = summary ? getImpactBadge(summary.dampak_tenaga_kerja) : undefined;

              return (
                <NewsCard
                  key={article.id}
                  title={article.title}
                  date={article.date}
                  source={article.source}
                  sourceName={article.source_name}
                  sourceColor={sourceInfo?.color}
                  excerpt={article.excerpt}
                  sectorTags={article.sector_tags}
                  impactBadge={impact}
                  summary={summary?.ringkasan}
                  url={article._source_url}
                />
              );
            })}
          </div>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Status Sumber Data</h2>
            <div className="divide-y divide-gray-50">
              {sourceEntries.map((source) => (
                <SourceStatusCard key={source.source} source={source} />
              ))}
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Ringkasan Cepat</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Berita</span>
                <span className="font-medium text-gray-900">{metadata.sources.news?.items_total || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Berita Hari Ini</span>
                <span className="font-medium text-gray-900">{newsData.filter((n) => n.date >= '2026-06-05').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sumber Aktif</span>
                <span className="font-medium text-gray-900">
                  {sourceEntries.filter((s) => s.status === 'ok').length}/{sourceEntries.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Laporan PHK</span>
                <span className="font-medium text-gray-900">{phkData.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
