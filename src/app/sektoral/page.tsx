'use client';

import { useState } from 'react';
import { KBLI_SECTORS, NEWS_SOURCES, PROVINCES, SECTOR_KEYWORDS } from '@/lib/constants';
import { getSampleNewsData, getSampleSummaries } from '@/lib/data-loader';
import { getImpactBadge } from '@/lib/utils';
import NewsCard from '@/components/cards/NewsCard';
import { cn } from '@/lib/utils';

export default function SektoralPage() {
  const [activeTab, setActiveTab] = useState<string>(KBLI_SECTORS[0].id);
  const [selectedProvince, setSelectedProvince] = useState<string>('00');
  
  const newsData = getSampleNewsData();
  const summaries = getSampleSummaries();

  // Filter news by active sector AND province (if not National)
  const filteredNews = newsData.filter((n) => {
    const matchesSector = n.sector_tags.includes(activeTab);
    // Assuming we add province_tags to news data (or infer from gemini sum)
    // For now we simulate filtering if n has province_code
    const matchesProvince = selectedProvince === '00' ? true : (n as any).province_code === selectedProvince;
    return matchesSector && matchesProvince;
  });

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left Sidebar (Sub-sidebar for Sektoral) */}
      <div className="w-full md:w-64 flex-shrink-0 space-y-4">
        {/* Province Selector (Moved to top) */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label htmlFor="province-select" className="text-sm font-semibold text-gray-900 block mb-2">Filter Provinsi</label>
          <select
            id="province-select"
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border bg-white cursor-pointer"
          >
            <option value="00">Nasional</option>
            {PROVINCES.map((prov) => (
              <option key={prov.code} value={prov.code}>
                {prov.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 px-2">Kategori KBLI</h2>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            {KBLI_SECTORS.map((sector) => (
              <button
                key={sector.id}
                onClick={() => setActiveTab(sector.id)}
                className={cn(
                  'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer text-left',
                  activeTab === sector.id
                    ? 'bg-[#CCFBF1] text-[#0D9488]'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <span className="w-6 text-center mr-2">{sector.icon}</span>
                <span className="flex-1 truncate" title={sector.label}>{sector.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* News Feed */}
          <div className="xl:col-span-2 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center">
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

          {/* Right Sidebar: Sector Stats & Keywords */}
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
                Kata Kunci Scraping
              </h3>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Kata kunci di bawah ini digunakan oleh robot untuk mendeteksi berita yang berkaitan dengan sektor ini.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SECTOR_KEYWORDS[activeTab]?.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-1 text-[11px] bg-gray-100 text-gray-600 rounded-md border border-gray-200"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
