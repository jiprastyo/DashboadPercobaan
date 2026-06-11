'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { NEWS_SOURCES, KBLI_SECTORS, PROVINCES } from '@/lib/constants';
import {
  filterNewsArchive,
  isVerifiedNewsDate,
  paginateNewsArchive,
  sortNewsArchiveByDate,
  type NewsArchiveArticle,
  type NewsArchiveDateQuality,
} from '@/lib/news-archive';
import SearchBar from '@/components/ui/SearchBar';
import FilterGroup from '@/components/ui/FilterGroup';
import Pagination from '@/components/ui/Pagination';
import NewsCard from '@/components/cards/NewsCard';

const ITEMS_PER_PAGE = 15;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const NEWS_ARCHIVE_URL = `${BASE_PATH}/data/news/historical-seed.json`;
const DATE_QUALITY_OPTIONS: { id: NewsArchiveDateQuality; label: string }[] = [
  { id: 'all', label: 'Semua tanggal' },
  { id: 'verified', label: 'Terverifikasi' },
  { id: 'estimated', label: 'Estimasi' },
  { id: 'original_feed', label: 'Feed asli' },
  { id: 'article_metadata', label: 'Metadata artikel' },
];

function formatNumber(value: number) {
  return value.toLocaleString('id-ID');
}

export default function BeritaClient() {
  const [articles, setArticles] = useState<NewsArchiveArticle[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDateQuality, setSelectedDateQuality] = useState<NewsArchiveDateQuality>('all');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadNewsArchive() {
      setLoading(true);
      setFailed(false);

      try {
        const response = await fetch(NEWS_ARCHIVE_URL);
        if (!response.ok) {
          throw new Error(`News archive returned ${response.status}`);
        }

        const data = (await response.json()) as NewsArchiveArticle[];
        if (!cancelled) {
          setArticles(sortNewsArchiveByDate(data));
        }
      } catch (error) {
        console.error('Failed to load news archive', error);
        if (!cancelled) {
          setFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNewsArchive();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredNews = useMemo(
    () =>
      filterNewsArchive(articles, {
        search,
        sources: selectedSources,
        sectors: selectedSectors,
        provinces: selectedProvinces,
        month: selectedMonth,
        dateQuality: selectedDateQuality,
      }),
    [
      articles,
      search,
      selectedSources,
      selectedSectors,
      selectedProvinces,
      selectedMonth,
      selectedDateQuality,
    ]
  );

  const archiveStats = useMemo(
    () =>
      articles.reduce(
        (stats, article) => {
          stats.total += 1;

          if (isVerifiedNewsDate(article)) {
            stats.verified += 1;
          } else {
            stats.estimated += 1;
          }

          if (article.date_source === 'original_feed') {
            stats.originalFeed += 1;
          }

          if (article.date_source === 'article_metadata') {
            stats.articleMetadata += 1;
          }

          return stats;
        },
        {
          total: 0,
          verified: 0,
          estimated: 0,
          originalFeed: 0,
          articleMetadata: 0,
        }
      ),
    [articles]
  );

  const total = filteredNews.length;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleNews = useMemo(
    () => paginateNewsArchive(filteredNews, currentPage, ITEMS_PER_PAGE),
    [filteredNews, currentPage]
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSourceChange = (value: string[]) => {
    setSelectedSources(value);
    setPage(1);
  };

  const handleSectorChange = (value: string[]) => {
    setSelectedSectors(value);
    setPage(1);
  };

  const handleProvinceChange = (value: string[]) => {
    setSelectedProvinces(value);
    setPage(1);
  };

  const activeFilterCount =
    selectedSources.length +
    selectedSectors.length +
    selectedProvinces.length +
    (selectedMonth ? 1 : 0) +
    (selectedDateQuality !== 'all' ? 1 : 0);

  return (
    <div className="space-y-4">
      <section className="border border-[var(--app-border)] bg-[var(--app-surface)]">
        <div className="space-y-3 p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchBar
                placeholder="Cari arsip berita historis..."
                value={search}
                onChange={handleSearchChange}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 whitespace-nowrap border px-3 py-2 text-sm transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'border-[var(--app-link)] bg-[var(--app-bg-soft)] text-[var(--app-text)]'
                  : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)]'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filter {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 gap-4 border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 md:grid-cols-2 xl:grid-cols-4">
              <FilterGroup
                label="Sumber"
                options={NEWS_SOURCES.map((source) => ({
                  id: source.id,
                  label: source.name,
                  color: source.color,
                }))}
                selected={selectedSources}
                onChange={handleSourceChange}
              />

              <FilterGroup
                label="Sektor KBLI"
                options={KBLI_SECTORS.map((sector) => ({
                  id: sector.id,
                  label: `${sector.icon} ${sector.label}`,
                }))}
                selected={selectedSectors}
                onChange={handleSectorChange}
              />

              <FilterGroup
                label="Provinsi"
                options={PROVINCES.map((province) => ({
                  id: province.name,
                  label: province.name,
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
                  onChange={(event) => {
                    setSelectedMonth(event.target.value);
                    setPage(1);
                  }}
                  className="w-full border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-sm text-[var(--app-text)] focus:border-[var(--app-link)] focus:outline-none"
                />
              </div>

              <div className="flex flex-col justify-start border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
                <label className="mb-3 text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">
                  Kualitas Tanggal
                </label>
                <select
                  value={selectedDateQuality}
                  onChange={(event) => {
                    setSelectedDateQuality(event.target.value as NewsArchiveDateQuality);
                    setPage(1);
                  }}
                  className="w-full border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-sm text-[var(--app-text)] focus:border-[var(--app-link)] focus:outline-none"
                >
                  {DATE_QUALITY_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!loading && !failed && (
            <div className="grid grid-cols-2 gap-2 border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-2 text-[12px] md:grid-cols-5">
              <div>
                <div className="font-semibold text-[var(--app-text)]">{formatNumber(archiveStats.total)}</div>
                <div className="text-[var(--app-subtle)]">arsip</div>
              </div>
              <div>
                <div className="font-semibold text-[var(--app-text)]">{formatNumber(archiveStats.verified)}</div>
                <div className="text-[var(--app-subtle)]">tanggal terverifikasi</div>
              </div>
              <div>
                <div className="font-semibold text-[var(--app-text)]">{formatNumber(archiveStats.originalFeed)}</div>
                <div className="text-[var(--app-subtle)]">dari feed asli</div>
              </div>
              <div>
                <div className="font-semibold text-[var(--app-text)]">{formatNumber(archiveStats.articleMetadata)}</div>
                <div className="text-[var(--app-subtle)]">dari metadata</div>
              </div>
              <div>
                <div className="font-semibold text-[var(--app-text)]">{formatNumber(archiveStats.estimated)}</div>
                <div className="text-[var(--app-subtle)]">masih estimasi</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[var(--app-muted)]">
              Menampilkan <span className="font-semibold text-[var(--app-text)]">{formatNumber(total)}</span> artikel
              {search && <span className="italic"> untuk &ldquo;{search}&rdquo;</span>}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface)]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-[var(--app-link)]"></div>
            <span className="ml-3 text-sm text-[var(--app-muted)]">Memuat arsip...</span>
          </div>
        ) : visibleNews.length > 0 ? (
          <div className="flex flex-col">
            {visibleNews.map((article, index) => {
              const sourceInfo = NEWS_SOURCES.find((source) => source.id === article.source);
              const tags: string[] = [...(article.keywords_matched || [])];

              article.sector_tags?.forEach((tagId) => {
                const sector = KBLI_SECTORS.find((item) => item.id === tagId);
                if (sector) {
                  tags.push(sector.label.split('.')[1]?.trim() || sector.label);
                }
              });

              const text = `${article.title || ''} ${article.excerpt || ''}`.toLowerCase();
              PROVINCES.forEach((province) => {
                if (text.includes(province.name.toLowerCase())) {
                  tags.push(province.name);
                }
              });

              const uniqueTags = Array.from(new Set(tags));

              return (
                <NewsCard
                  key={article.id || `${article.source}-${article.date}-${index}`}
                  title={article.title || ''}
                  date={article.date || ''}
                  source={article.source || ''}
                  sourceName={article.source_name || article.source || 'Sumber berita'}
                  sourceColor={sourceInfo?.color}
                  excerpt={article.excerpt || ''}
                  sectorTags={uniqueTags}
                  url={article._source_url || article.link || '#'}
                  isEstimated={article.is_estimated}
                  dateSource={article.date_source}
                  className="rounded-none border-x-0 px-4 first:border-t-0 last:border-b-0"
                />
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-[var(--app-muted)]">
              {failed ? 'Data belum dapat dimuat.' : 'Tidak ada berita yang cocok dengan filter pencarian.'}
            </p>
          </div>
        )}
      </section>

      {!loading && totalPages > 1 && (
        <div className="pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
