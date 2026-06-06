'use client';

import { useState, useEffect } from 'react';
import { NEWS_SOURCES, KBLI_SECTORS } from '@/lib/constants';
import SearchBar from '@/components/ui/SearchBar';
import FilterGroup from '@/components/ui/FilterGroup';
import Pagination from '@/components/ui/Pagination';
import NewsCard from '@/components/cards/NewsCard';

const ITEMS_PER_PAGE = 10;

export default function BeritaPage() {
  const [search, setSearch] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  
  const [news, setNews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          page: page.toString(),
          limit: ITEMS_PER_PAGE.toString(),
          search: search,
          sources: selectedSources.join(','),
          sectors: selectedSectors.join(',')
        });
        
        const res = await fetch(`/api/news?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setNews(data.data);
          setTotal(data.total);
          setTotalPages(data.totalPages);
        }
      } catch (err) {
        console.error("Failed to fetch news", err);
      } finally {
        setLoading(false);
      }
    }
    
    const timeout = setTimeout(() => {
      fetchNews();
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [page, search, selectedSources, selectedSectors]);

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
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm">
        <SearchBar
          placeholder="Cari dari 62.000+ arsip berita historis..."
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
        <p className="text-sm text-gray-500 font-medium">
          Menampilkan <span className="text-blue-600 font-bold">{total.toLocaleString()}</span> berita historis
          {search && <span className="italic"> untuk &ldquo;{search}&rdquo;</span>}
        </p>
      </div>

      {/* News List */}
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500 font-medium">Memuat Arsip Database...</span>
        </div>
      ) : news.length > 0 ? (
        <div className="space-y-4">
          {news.map((article) => {
            const sourceInfo = NEWS_SOURCES.find((s) => s.id === article.source);
            
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
                url={article._source_url}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center shadow-sm">
          <p className="text-gray-500 font-medium">Tidak ada berita yang cocok dengan filter pencarian.</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
