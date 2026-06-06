'use client';

import { useState, useEffect } from 'react';
import { NEWS_SOURCES, KBLI_SECTORS, PROVINCES } from '@/lib/constants';
import SearchBar from '@/components/ui/SearchBar';
import FilterGroup from '@/components/ui/FilterGroup';
import Pagination from '@/components/ui/Pagination';
import NewsCard from '@/components/cards/NewsCard';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';

const ITEMS_PER_PAGE = 15; // Increased items per page for denser UI

export default function BeritaPage() {
  const [search, setSearch] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
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
          sectors: selectedSectors.join(','),
          provinces: selectedProvinces.join(',')
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
  }, [page, search, selectedSources, selectedSectors, selectedProvinces]);

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
  const handleProvinceChange = (val: string[]) => {
    setSelectedProvinces(val);
    setPage(1);
  };

  const activeFilterCount = selectedSources.length + selectedSectors.length + selectedProvinces.length;

  return (
    <div className="space-y-3">
      {/* Search Bar - Always Visible */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <SearchBar
            placeholder="Cari dari 62.000+ arsip berita historis..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-md transition-colors whitespace-nowrap ${
            showFilters || activeFilterCount > 0 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filter {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
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
            label="Sektor KBLI"
            options={KBLI_SECTORS.map((s) => ({
              id: s.id,
              label: `${s.icon} ${s.label}`,
            }))}
            selected={selectedSectors}
            onChange={handleSectorChange}
          />

          <FilterGroup
            label="Provinsi"
            options={PROVINCES.map((p) => ({
              id: p.name,
              label: p.name,
            }))}
            selected={selectedProvinces}
            onChange={handleProvinceChange}
          />
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between mt-2 mb-1">
        <p className="text-[13px] text-gray-500 font-medium">
          Menampilkan <span className="text-blue-600 font-bold">{total.toLocaleString()}</span> artikel
          {search && <span className="italic"> untuk &ldquo;{search}&rdquo;</span>}
        </p>
      </div>

      {/* News List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-8 flex justify-center items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-500 font-medium">Memuat Arsip...</span>
          </div>
        ) : news.length > 0 ? (
          <div className="flex flex-col">
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
                  sectorTags={article.keywords_matched || article.sector_tags}
                  url={article._source_url}
                  className="border-x-0 first:border-t-0 last:border-b-0 rounded-none px-4"
                />
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-gray-500 text-sm font-medium">Tidak ada berita yang cocok dengan filter pencarian.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="pt-2">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
