'use client';

import { useState } from 'react';
import { KBLI_SECTORS, NEWS_SOURCES } from '@/lib/constants';
import { getSampleNewsData, getSampleSummaries } from '@/lib/data-loader';
import { getImpactBadge } from '@/lib/utils';
import NewsCard from '@/components/cards/NewsCard';
import { cn } from '@/lib/utils';

export default function SektoralPage() {
  const [activeTab, setActiveTab] = useState<string>(KBLI_SECTORS[0].id);
  const newsData = getSampleNewsData();
  const summaries = getSampleSummaries();

  // Filter news by active sector
  const filteredNews = newsData.filter((n) =>
    n.sector_tags.includes(activeTab)
  );

  return (
    <div className="space-y-6">
      {/* Sector Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg p-2">
        <div className="flex flex-wrap gap-1">
          {KBLI_SECTORS.map((sector) => (
            <button
              key={sector.id}
              onClick={() => setActiveTab(sector.id)}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap',
                activeTab === sector.id
                  ? 'bg-[#CCFBF1] text-[#0D9488]'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <span className="mr-1.5">{sector.icon}</span>
              {sector.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            Berita — {KBLI_SECTORS.find((s) => s.id === activeTab)?.label}
          </h2>
          {filteredNews.length > 0 ? (
            <div className="space-y-3">
              {filteredNews.map((article) => {
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
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
              <p className="text-gray-400 text-sm">
                Belum ada berita untuk sektor ini dalam periode terpilih.
              </p>
            </div>
          )}
        </div>

        {/* Employment Data Placeholder */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Data Ketenagakerjaan Sektor
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-medium">Jumlah Pekerja</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">—</p>
                <p className="text-xs text-gray-400 mt-0.5">Data Sakernas 2025</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-medium">Kontribusi PDB</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">—</p>
                <p className="text-xs text-gray-400 mt-0.5">Data BPS Q1 2026</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-medium">Pertumbuhan YoY</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">—</p>
                <p className="text-xs text-gray-400 mt-0.5">Menunggu data Sakernas</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4 italic">
              Data sektoral detail akan tersedia setelah integrasi dengan API BPS.
            </p>
          </div>

          {/* Sector Keywords */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Kata Kunci Sektor
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(
                {
                  pertanian: ['pertanian', 'perkebunan', 'perikanan', 'sawit', 'padi'],
                  pertambangan: ['tambang', 'nikel', 'batu bara', 'smelter', 'hilirisasi'],
                  industri: ['manufaktur', 'pabrik', 'garmen', 'tekstil', 'otomotif'],
                  konstruksi: ['konstruksi', 'properti', 'infrastruktur', 'jalan tol'],
                  perdagangan: ['perdagangan', 'retail', 'UMKM', 'e-commerce'],
                  akomodasi: ['hotel', 'restoran', 'pariwisata', 'wisata'],
                  transportasi: ['transportasi', 'logistik', 'pelabuhan', 'penerbangan'],
                  infokom: ['teknologi', 'startup', 'digital', 'telekomunikasi'],
                  keuangan: ['perbankan', 'asuransi', 'fintech', 'OJK'],
                } as Record<string, string[]>
              )[activeTab]?.map((kw) => (
                <span
                  key={kw}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md border border-gray-200"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
