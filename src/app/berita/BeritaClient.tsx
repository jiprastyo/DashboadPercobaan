'use client';

import { useEffect, useMemo, useState } from 'react';
import { NEWS_SOURCES, KBLI_SECTORS, PROVINCES } from '@/lib/constants';
import {
  filterNewsArchive,
  paginateNewsArchive,
  sortNewsArchiveByDate,
  type NewsArchiveArticle,
  type NewsArchiveDateQuality,
} from '@/lib/news-archive';
import SearchBar from '@/components/ui/SearchBar';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import ActiveFilterChips from '@/components/ui/ActiveFilterChips';
import Pagination from '@/components/ui/Pagination';
import NewsCard from '@/components/cards/NewsCard';
import EditorialPageShell from '@/components/layout/EditorialPageShell';

const ITEMS_PER_PAGE = 15;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const NEWS_ARCHIVE_URL = `${BASE_PATH}/data/news/historical-seed.json`;
const DATE_QUALITY_OPTIONS: { id: NewsArchiveDateQuality; label: string }[] = [
  { id: 'all', label: 'Semua kualitas tanggal' },
  { id: 'verified', label: 'Tanggal terverifikasi' },
  { id: 'estimated', label: 'Tanggal estimasi' },
  { id: 'original_feed', label: 'Tanggal dari feed asli' },
  { id: 'article_metadata', label: 'Tanggal dari metadata artikel' },
];
const MONTH_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
});

export default function BeritaClient() {
  const [articles, setArticles] = useState<NewsArchiveArticle[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDateQuality, setSelectedDateQuality] = useState<NewsArchiveDateQuality>('all');
  const [page, setPage] = useState(1);
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
        keywords: selectedKeywords,
        provinces: selectedProvinces,
        month: selectedMonth,
        dateQuality: selectedDateQuality,
      }),
    [
      articles,
      search,
      selectedSources,
      selectedSectors,
      selectedKeywords,
      selectedProvinces,
      selectedMonth,
      selectedDateQuality,
    ]
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

  const handleKeywordChange = (value: string[]) => {
    setSelectedKeywords(value);
    setPage(1);
  };

  const handleProvinceChange = (value: string[]) => {
    setSelectedProvinces(value);
    setPage(1);
  };

  const keywordOptions = useMemo(
    () => Array.from(new Set(articles.flatMap((article) => article.keywords_matched || []))).sort(),
    [articles]
  );
  const availableMonths = useMemo(
    () =>
      Array.from(new Set(articles.map((article) => article.date?.slice(0, 7)).filter(Boolean) as string[]))
        .sort()
        .reverse(),
    [articles]
  );

  const toggleSourceFilter = (sourceId: string) => {
    handleSourceChange(
      selectedSources.includes(sourceId)
        ? selectedSources.filter((item) => item !== sourceId)
        : [...selectedSources, sourceId]
    );
  };

  const toggleSectorFilter = (sectorId: string) => {
    handleSectorChange(
      selectedSectors.includes(sectorId)
        ? selectedSectors.filter((item) => item !== sectorId)
        : [...selectedSectors, sectorId]
    );
  };

  const toggleKeywordFilter = (keyword: string) => {
    handleKeywordChange(
      selectedKeywords.includes(keyword)
        ? selectedKeywords.filter((item) => item !== keyword)
        : [...selectedKeywords, keyword]
    );
  };

  const toggleProvinceFilter = (province: string) => {
    handleProvinceChange(
      selectedProvinces.includes(province)
        ? selectedProvinces.filter((item) => item !== province)
        : [...selectedProvinces, province]
    );
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedSources([]);
    setSelectedSectors([]);
    setSelectedKeywords([]);
    setSelectedProvinces([]);
    setSelectedMonth('');
    setSelectedDateQuality('all');
    setPage(1);
  };

  const dateQualityLabel = DATE_QUALITY_OPTIONS.find((option) => option.id === selectedDateQuality)?.label;
  const activeFilters = [
    ...(search
      ? [
          {
            id: `search-${search}`,
            label: `Cari: ${search}`,
            onRemove: () => handleSearchChange(''),
          },
        ]
      : []),
    ...selectedSources.map((sourceId) => ({
      id: `source-${sourceId}`,
      label: `Sumber: ${NEWS_SOURCES.find((source) => source.id === sourceId)?.name || sourceId}`,
      onRemove: () => handleSourceChange(selectedSources.filter((item) => item !== sourceId)),
    })),
    ...selectedKeywords.map((keyword) => ({
      id: `keyword-${keyword}`,
      label: `Kata kunci: ${keyword}`,
      onRemove: () => handleKeywordChange(selectedKeywords.filter((item) => item !== keyword)),
    })),
    ...selectedSectors.map((sectorId) => ({
      id: `sector-${sectorId}`,
      label: `Sektor: ${KBLI_SECTORS.find((sector) => sector.id === sectorId)?.label || sectorId}`,
      onRemove: () => handleSectorChange(selectedSectors.filter((item) => item !== sectorId)),
    })),
    ...selectedProvinces.map((province) => ({
      id: `province-${province}`,
      label: `Provinsi: ${province}`,
      onRemove: () => handleProvinceChange(selectedProvinces.filter((item) => item !== province)),
    })),
    ...(selectedMonth
      ? [
          {
            id: `month-${selectedMonth}`,
            label: `Bulan: ${MONTH_FORMATTER.format(new Date(`${selectedMonth}-01T00:00:00Z`))}`,
            onRemove: () => {
              setSelectedMonth('');
              setPage(1);
            },
          },
        ]
      : []),
    ...(selectedDateQuality !== 'all' && dateQualityLabel
      ? [
          {
            id: `date-quality-${selectedDateQuality}`,
            label: `Tanggal: ${dateQualityLabel}`,
            onRemove: () => {
              setSelectedDateQuality('all');
              setPage(1);
            },
          },
        ]
      : []),
  ];

  const sidebar = (
    <div className="space-y-4">
      <SearchBar
        placeholder="Cari judul atau kata kunci berita"
        ariaLabel="Cari judul atau kata kunci berita"
        value={search}
        onChange={handleSearchChange}
      />

      <select
        value={selectedMonth}
        onChange={(event) => {
          setSelectedMonth(event.target.value);
          setPage(1);
        }}
        aria-label="Saring bulan publikasi"
        className="w-full border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-sm text-[var(--app-text)] focus:border-[var(--app-link)] focus:outline-none"
      >
        <option value="">Semua bulan publikasi</option>
        {availableMonths.map((month) => (
          <option key={month} value={month}>
            {MONTH_FORMATTER.format(new Date(`${month}-01T00:00:00Z`))}
          </option>
        ))}
      </select>

      <select
        value={selectedDateQuality}
        onChange={(event) => {
          setSelectedDateQuality(event.target.value as NewsArchiveDateQuality);
          setPage(1);
        }}
        aria-label="Saring kualitas tanggal berita"
        className="w-full border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-sm text-[var(--app-text)] focus:border-[var(--app-link)] focus:outline-none"
      >
        {DATE_QUALITY_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>

      <MultiSelectDropdown
        options={NEWS_SOURCES.map((source) => ({
          id: source.id,
          label: source.name,
          color: source.color,
        }))}
        selected={selectedSources}
        onChange={handleSourceChange}
        placeholder="Sumber berita"
      />

      <MultiSelectDropdown
        options={keywordOptions.map((keyword) => ({ id: keyword, label: keyword }))}
        selected={selectedKeywords}
        onChange={handleKeywordChange}
        placeholder="Kata kunci berita"
      />

      <MultiSelectDropdown
        options={KBLI_SECTORS.map((sector) => ({
          id: sector.id,
          label: `${sector.icon} ${sector.label}`,
        }))}
        selected={selectedSectors}
        onChange={handleSectorChange}
        placeholder="Sektor KBLI"
      />

      <MultiSelectDropdown
        options={PROVINCES.map((province) => ({
          id: province.name,
          label: province.name,
        }))}
        selected={selectedProvinces}
        onChange={handleProvinceChange}
        placeholder="Provinsi dalam artikel"
      />
    </div>
  );

  return (
    <EditorialPageShell
      eyebrow="Arsip berita"
      title="Arsip berita ketenagakerjaan"
      description="Kompilasi arsip lokal untuk isu tenaga kerja dan pasar kerja, lengkap dengan pemisahan tanggal hasil feed, metadata artikel, dan estimasi yang masih perlu dipulihkan."
      summary={
        <div className="space-y-2">
          <div className="text-lg font-semibold text-[var(--app-text)]">
            {loading ? 'Memuat arsip' : failed ? 'Indeks belum tersedia' : `${total.toLocaleString('id-ID')} hasil aktif`}
          </div>
          <p className="text-xs leading-5 text-[var(--app-muted)]">
            Filter tanggal memisahkan feed asli, metadata artikel, dan entri yang masih memakai tanggal estimasi.
          </p>
        </div>
      }
      sidebar={sidebar}
      showSidebar
    >
      <section className="border border-[var(--app-border)] bg-[var(--app-surface)]">
        <div className="space-y-3 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[var(--app-muted)]">
              Menampilkan <span className="font-semibold text-[var(--app-text)]">{total.toLocaleString('id-ID')}</span> artikel
              {search && <span className="italic"> untuk &ldquo;{search}&rdquo;</span>}
            </p>
          </div>

          <ActiveFilterChips items={activeFilters} onResetAll={resetFilters} />
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
              const text = `${article.title || ''} ${article.excerpt || ''}`.toLowerCase();
              const tagItems = [
                ...(article.keywords_matched || []).map((keyword) => ({
                  id: `keyword:${keyword}`,
                  label: keyword,
                  onClick: () => toggleKeywordFilter(keyword),
                })),
                ...(article.sector_tags || []).flatMap((tagId) => {
                  const sector = KBLI_SECTORS.find((item) => item.id === tagId);
                  if (!sector) {
                    return [];
                  }

                  return [
                    {
                      id: `sector:${sector.id}`,
                      label: sector.label.split('.')[1]?.trim() || sector.label,
                      onClick: () => toggleSectorFilter(sector.id),
                    },
                  ];
                }),
                ...PROVINCES.filter((province) => text.includes(province.name.toLowerCase())).map((province) => ({
                  id: `province:${province.name}`,
                  label: province.name,
                  onClick: () => toggleProvinceFilter(province.name),
                })),
              ].filter((tag, tagIndex, allTags) => allTags.findIndex((item) => item.id === tag.id) === tagIndex);

              return (
                <NewsCard
                  key={article.id || `${article.source}-${article.date}-${index}`}
                  title={article.title || ''}
                  date={article.date || ''}
                  sourceName={article.source_name || article.source || 'Sumber berita'}
                  sourceOnClick={article.source ? () => toggleSourceFilter(article.source || '') : undefined}
                  tags={tagItems}
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
    </EditorialPageShell>
  );
}
