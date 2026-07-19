'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import ActiveFilterChips from '@/components/ui/ActiveFilterChips';
import CompactChip from '@/components/ui/CompactChip';
import Pagination from '@/components/ui/Pagination';
import SearchBar from '@/components/ui/SearchBar';
import EditorialPageShell from '@/components/layout/EditorialPageShell';
import SourceFreshnessBadge from '@/components/ui/SourceFreshnessBadge';
import type { BPSBRSArchive, BPSBRSIndicator, SourceFreshness } from '@/lib/data-loader-server';

const ITEMS_PER_PAGE = 18;

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

interface BRSClientProps {
  archive: BPSBRSArchive;
  freshness: SourceFreshness;
}

const RELEASE_CADENCE = [
  { label: 'Wisman', cadence: 'awal bulan', note: 'rilis bulanan' },
  { label: 'NTP', cadence: 'awal bulan', note: 'rilis bulanan' },
  { label: 'Ekspor-Impor', cadence: 'pertengahan bulan', note: 'rilis bulanan' },
  { label: 'PDB', cadence: 'Feb, Mei, Agu, Nov', note: 'rilis triwulanan' },
  { label: 'Ketenagakerjaan', cadence: 'Feb, Mei, Agu, Nov', note: 'rilis triwulanan/semesteran' },
  { label: 'Kemiskinan', cadence: 'Jan dan Jul', note: 'rilis semesteran' },
];

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return DATE_FORMATTER.format(parsed);
}

export default function BRSClient({ archive, freshness }: BRSClientProps) {
  const [search, setSearch] = useState('');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedIndicators, setSelectedIndicators] = useState<BPSBRSIndicator[]>([]);
  const [page, setPage] = useState(1);

  const filteredReleases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return archive.releases.filter((release) => {
      const matchesSearch =
        !query ||
        release.title.toLowerCase().includes(query) ||
        release.summary.toLowerCase().includes(query) ||
        release.indicatorLabel.toLowerCase().includes(query);
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(release.year);
      const matchesIndicator = selectedIndicators.length === 0 || selectedIndicators.includes(release.indicator);

      return matchesSearch && matchesYear && matchesIndicator;
    });
  }, [archive.releases, search, selectedIndicators, selectedYears]);

  const totalPages = Math.max(1, Math.ceil(filteredReleases.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleReleases = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReleases.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, filteredReleases]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const toggleYear = (value: string) => {
    setSelectedYears((current) =>
      current.includes(value) ? current.filter((year) => year !== value) : [...current, value]
    );
    setPage(1);
  };

  const toggleIndicator = (value: BPSBRSIndicator) => {
    setSelectedIndicators((current) =>
      current.includes(value) ? current.filter((indicator) => indicator !== value) : [...current, value]
    );
    setPage(1);
  };

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
    ...selectedYears.map((year) => ({
      id: `year-${year}`,
      label: `Tahun: ${year}`,
      onRemove: () => {
        setSelectedYears((current) => current.filter((item) => item !== year));
        setPage(1);
      },
    })),
    ...selectedIndicators.map((indicatorId) => ({
      id: `indicator-${indicatorId}`,
      label: `Tipe: ${archive.indicators.find((indicator) => indicator.id === indicatorId)?.label || indicatorId}`,
      onRemove: () => {
        setSelectedIndicators((current) => current.filter((item) => item !== indicatorId));
        setPage(1);
      },
    })),
  ];

  const resetFilters = () => {
    setSearch('');
    setSelectedYears([]);
    setSelectedIndicators([]);
    setPage(1);
  };

  const sidebar = (
    <div className="space-y-4">
      <SearchBar
        placeholder="Cari judul, ringkasan, atau tipe BRS"
        ariaLabel="Cari judul, ringkasan, atau tipe BRS"
        value={search}
        onChange={handleSearchChange}
      />

      <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
          Tahun
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <CompactChip active={selectedYears.length === 0} onClick={() => {
            setSelectedYears([]);
            setPage(1);
          }}>
            Semua tahun
          </CompactChip>
          {archive.years.map((year) => (
            <CompactChip
              key={year}
              active={selectedYears.includes(year)}
              onClick={() => toggleYear(year)}
            >
              {year}
            </CompactChip>
          ))}
        </div>
      </div>

      <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
          Tipe BRS
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <CompactChip active={selectedIndicators.length === 0} onClick={() => {
            setSelectedIndicators([]);
            setPage(1);
          }}>
            Semua BRS ({archive.total.toLocaleString('id-ID')})
          </CompactChip>
          {archive.indicators.map((indicator) => {
            const active = selectedIndicators.includes(indicator.id);
            return (
              <CompactChip
                key={indicator.id}
                active={active}
                onClick={() => toggleIndicator(indicator.id)}
              >
                {indicator.shortLabel} ({archive.byIndicator[indicator.id].toLocaleString('id-ID')})
              </CompactChip>
            );
          })}
        </div>
      </div>

      <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
            Jadwal rilis umum
          </div>
          <SourceFreshnessBadge status={freshness.status} lastFetch={freshness.lastFetch} reason={freshness.reason} />
        </div>
        <div className="mt-3 divide-y divide-[var(--app-border)]">
          {RELEASE_CADENCE.map((item) => (
            <div key={item.label} className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 py-2 text-xs">
              <div className="font-semibold text-[var(--app-text)]">{item.label}</div>
              <div className="min-w-0 text-[var(--app-muted)]">
                <div>{item.cadence}</div>
                <div className="text-[var(--app-subtle)]">{item.note}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-4 text-[var(--app-subtle)]">
          API BPS menyimpan tanggal rilis sebagai rl_date; sch_date tidak muncul pada probe endpoint pressrelease.
        </p>
      </div>
    </div>
  );

  return (
    <EditorialPageShell
      sidebar={sidebar}
      showSidebar
    >
      <section className="border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--app-muted)]">
            Menampilkan <span className="font-semibold text-[var(--app-text)]">{filteredReleases.length.toLocaleString('id-ID')}</span> rilis
          </p>
          <p className="text-xs text-[var(--app-subtle)]">
            {archive.years.length > 0 ? `${archive.years.at(-1)}-${archive.years[0]}` : 'Belum ada tahun'}
          </p>
        </div>
        <ActiveFilterChips items={activeFilters} onResetAll={resetFilters} />
      </section>

      <section className="border border-[var(--app-border)] bg-[var(--app-surface)]">
        {visibleReleases.length > 0 ? (
          <div className="divide-y divide-[var(--app-border)]">
            {visibleReleases.map((release) => (
              <article key={release.id} className="grid gap-3 px-4 py-4 md:grid-cols-[132px_minmax(0,1fr)_auto]">
                <div className="space-y-1 text-xs text-[var(--app-subtle)]">
                  <time dateTime={release.date} className="font-semibold text-[var(--app-muted)]">
                    {formatDate(release.date)}
                  </time>
                  <button
                    type="button"
                    onClick={() => toggleIndicator(release.indicator)}
                    className="block border border-[var(--app-border)] px-2 py-1 text-left text-[11px] font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
                  >
                    {release.indicatorLabel}
                  </button>
                </div>

                <div className="min-w-0 space-y-2">
                  <h2 className="text-base font-semibold leading-6 text-[var(--app-text)]">
                    {release.title}
                  </h2>
                  {release.summary ? (
                    <p className="text-sm leading-6 text-[var(--app-muted)]">
                      {release.summary}
                    </p>
                  ) : null}
                </div>

                <a
                  href={release.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-2 border border-[var(--app-border)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-text)] hover:bg-[var(--app-bg-soft)] focus-visible:app-focus md:self-start"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--app-subtle)]" />
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-[var(--app-muted)]">
            Tidak ada BRS yang cocok dengan filter aktif.
          </div>
        )}
      </section>

      {totalPages > 1 ? (
        <div className="pt-2">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </EditorialPageShell>
  );
}
