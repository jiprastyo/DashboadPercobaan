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
  const [selectedMonth, setSelectedMonth] = useState('');
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
          provinces: selectedProvinces.join(','),
          ...(selectedMonth ? { month: selectedMonth } : {})
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
  }, [page, search, selectedSources, selectedSectors, selectedProvinces, selectedMonth]);

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

  const activeFilterCount = selectedSources.length + selectedSectors.length + selectedProvinces.length + (selectedMonth ? 1 : 0);

  return (
    <div className="space-y-4">
      <section className="border border-[var(--app-border)] bg-[var(--app-surface)]">
        <div className="border-b border-[var(--app-border)] px-3 py-3">
          <h1 className="text-lg font-semibold text-[var(--app-text)]">Arsip berita</h1>
        </div>
        <div className="space-y-3 p-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchBar
            placeholder="Cari dari 62.000+ arsip berita historis..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 border px-3 py-2 text-sm transition-colors whitespace-nowrap ${
            showFilters || activeFilterCount > 0 
              ? 'border-[var(--app-link)] bg-[var(--app-bg-soft)] text-[var(--app-text)]' 
              : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)]'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filter {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-4 border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 md:grid-cols-3">
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
          
          <div className="flex flex-col justify-start border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
            <label className="mb-3 text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">
              Bulan Publikasi
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPage(1);
              }}
              className="w-full border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-sm text-[var(--app-text)] focus:border-[var(--app-link)] focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[var(--app-muted)]">
          Menampilkan <span className="font-semibold text-[var(--app-text)]">{total.toLocaleString()}</span> artikel
          {search && <span className="italic"> untuk &ldquo;{search}&rdquo;</span>}
        </p>
      </div>
        </div>
      </section>

      <section className="border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-[var(--app-link)]"></div>
            <span className="ml-3 text-sm text-[var(--app-muted)]">Memuat arsip...</span>
          </div>
        ) : news.length > 0 ? (
          <div className="flex flex-col">
            {news.map((article) => {
              const sourceInfo = NEWS_SOURCES.find((s) => s.id === article.source);
              
              // Combine and map all tags (Keywords + Sektoral + Provinces)
              const tags: string[] = [...(article.keywords_matched || [])];
              
              // Add Sektoral names
              if (article.sector_tags) {
                article.sector_tags.forEach((tagId: string) => {
                  const kbli = KBLI_SECTORS.find(k => k.id === tagId);
                  if (kbli) tags.push(kbli.label.split('.')[1].trim());
                });
              }
              
              // Add Province names
              const text = `${article.title || ''} ${article.excerpt || ''}`.toLowerCase();
              PROVINCES.forEach(p => {
                if (text.includes(p.name.toLowerCase())) tags.push(p.name);
              });
              
              const uniqueTags = Array.from(new Set(tags));

              return (
                <NewsCard
                  key={article.id}
                  title={article.title}
                  date={article.date}
                  source={article.source}
                  sourceName={article.source_name}
                  sourceColor={sourceInfo?.color}
                  excerpt={article.excerpt}
                  sectorTags={uniqueTags}
                  url={article._source_url}
                  isEstimated={article.is_estimated}
                  className="rounded-none border-x-0 px-4 first:border-t-0 last:border-b-0"
                />
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-[var(--app-muted)]">Tidak ada berita yang cocok dengan filter pencarian.</p>
          </div>
        )}
      </section>

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
