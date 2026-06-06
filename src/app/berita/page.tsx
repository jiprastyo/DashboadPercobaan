'use client';

import { useState, useMemo } from 'react';
import { getSampleNewsData, getSampleSummaries } from '@/lib/data-loader';
import { NEWS_SOURCES, KBLI_SECTORS } from '@/lib/constants';
import { getImpactBadge } from '@/lib/utils';
import SearchBar from '@/components/ui/SearchBar';
import FilterGroup from '@/components/ui/FilterGroup';
import Pagination from '@/components/ui/Pagination';
import NewsCard from '@/components/cards/NewsCard';

const ITEMS_PER_PAGE = 4;

export default function BeritaPage() {
  const allNews = getSampleNewsData();
  const summaries = getSampleSummaries();
  const [search, setSearch] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Filter news
  const filteredNews = useMemo(() => {
    let result = allNews;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.excerpt.toLowerCase().includes(q)
      );
    }

    if (selectedSources.length > 0) {
      result = result.filter((n) => selectedSources.includes(n.source));
    }

    if (selectedSectors.length > 0) {
      result = result.filter((n) =>
        n.sector_tags.some((tag) => selectedSectors.includes(tag))
      );
    }

    return result;
  }, [allNews, search, selectedSources, selectedSectors]);

  const totalPages = Math.max(1, Math.ceil(filteredNews.length / ITEMS_PER_PAGE));
  const paginatedNews = filteredNews.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };
  const handleSourceChange = (val: string[]) => {
    setSelectedSources(val);
    setPage(1);
  };
  const handleSectorChange = (val: string[]) => {
    setSelectedSectors(val);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <SearchBar
          placeholder="Cari judul atau isi berita..."
          value={search}
          onChange={handleSearchChange}
        />

        <FilterGroup
          label="Sumber"
          options={NEWS_SOURCES.map((s) => ({
            id: s.id,
            label: s.name,
            color: s.color,
          }))}
          selected={selectedSources}
          onChange={handleSourceChange}
        />

        <FilterGroup
          label="Sektor"
          options={KBLI_SECTORS.map((s) => ({
            id: s.id,
            label: `${s.icon} ${s.label}`,
          }))}
          selected={selectedSectors}
          onChange={handleSectorChange}
        />
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Menampilkan {filteredNews.length} berita
          {search && <span className="italic"> untuk &ldquo;{search}&rdquo;</span>}
        </p>
      </div>

      {/* News List */}
      {paginatedNews.length > 0 ? (
        <div className="space-y-3">
          {paginatedNews.map((article) => {
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
          <p className="text-gray-400 text-sm">Tidak ada berita yang cocok dengan filter.</p>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
