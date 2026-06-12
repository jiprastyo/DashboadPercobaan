'use client';

import React, { useMemo, useState } from 'react';
import type { ResearchFinding } from '@/data/research';
import SearchBar from '@/components/ui/SearchBar';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import ActiveFilterChips from '@/components/ui/ActiveFilterChips';
import { getTagPillStyle } from '@/lib/tag-palette';
import { formatDate, truncateText } from '@/lib/utils';
import EditorialPageShell from '@/components/layout/EditorialPageShell';

interface RisetAkademikClientProps {
  initialData: ResearchFinding[];
}

export default function RisetAkademikClient({ initialData }: RisetAkademikClientProps) {
  const [search, setSearch] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  const allSources = useMemo(() => Array.from(new Set(initialData.map((item) => item.source))).sort(), [initialData]);
  const allKeywords = useMemo(() => {
    const sourceNames = new Set(allSources.map((source) => source.toLowerCase()));
    return Array.from(
      new Set(
        initialData
          .flatMap((item) => item.tags)
          .filter((tag) => !sourceNames.has(tag.toLowerCase()))
      )
    ).sort();
  }, [allSources, initialData]);

  const resetFilters = () => {
    setSearch('');
    setSelectedSources([]);
    setSelectedKeywords([]);
  };

  const toggleKeywordFilter = (keyword: string) => {
    setSelectedKeywords((current) =>
      current.includes(keyword) ? current.filter((item) => item !== keyword) : [...current, keyword]
    );
  };

  const filteredResearch = useMemo(() => {
    return initialData.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.summary.toLowerCase().includes(search.toLowerCase()) ||
        item.source.toLowerCase().includes(search.toLowerCase());
      const matchesSource = selectedSources.length === 0 || selectedSources.includes(item.source);
      const matchesKeywords = selectedKeywords.length === 0 || selectedKeywords.every((tag) => item.tags.includes(tag));
      return matchesSearch && matchesSource && matchesKeywords;
    });
  }, [initialData, search, selectedSources, selectedKeywords]);

  const activeFilters = [
    ...(search
      ? [
          {
            id: `search-${search}`,
            label: `Cari: ${search}`,
            onRemove: () => setSearch(''),
          },
        ]
      : []),
    ...selectedSources.map((source) => ({
      id: `source-${source}`,
      label: `Sumber: ${source}`,
      onRemove: () => setSelectedSources(selectedSources.filter((item) => item !== source)),
    })),
    ...selectedKeywords.map((keyword) => ({
      id: `keyword-${keyword}`,
      label: `Kata kunci: ${keyword}`,
      onRemove: () => setSelectedKeywords(selectedKeywords.filter((item) => item !== keyword)),
    })),
  ];

  return (
    <EditorialPageShell
      eyebrow="Riset akademik"
      title="Riset Sakernas dan pasar kerja"
      description="Katalog paper, working paper, dan publikasi akademik yang menyinggung Sakernas, pengangguran, TPAK, NEET, dan dinamika tenaga kerja Indonesia."
      summary={
        <div className="space-y-2">
          <div className="text-lg font-semibold text-[var(--app-text)]">{initialData.length} entri</div>
          <p className="text-xs leading-5 text-[var(--app-muted)]">
            {allSources.length} sumber unik dan {allKeywords.length} kata kunci siap dipilah.
          </p>
        </div>
      }
      sidebar={
        <div className="space-y-4">
          <SearchBar
            placeholder="Cari judul, ringkasan, atau sumber riset"
            ariaLabel="Cari judul, ringkasan, atau sumber riset"
            value={search}
            onChange={setSearch}
          />

          <MultiSelectDropdown
            options={allSources.map((source) => ({ id: source, label: source }))}
            selected={selectedSources}
            onChange={setSelectedSources}
            placeholder="Sumber riset"
          />

          <MultiSelectDropdown
            options={allKeywords.map((keyword) => ({ id: keyword, label: keyword }))}
            selected={selectedKeywords}
            onChange={setSelectedKeywords}
            placeholder="Kata kunci riset"
          />
        </div>
      }
      showSidebar
    >
      <section className="border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-3 text-xs text-[var(--app-muted)]">
        <div>Menampilkan {filteredResearch.length} dari {initialData.length} entri.</div>
        <ActiveFilterChips items={activeFilters} onResetAll={resetFilters} />
      </section>

      {filteredResearch.length > 0 ? (
        <section className="border border-[var(--app-border)] bg-[var(--app-surface)]">
          <div className="divide-y divide-[var(--app-border)]">
            {filteredResearch.map((item) => (
              <article key={item.id} className="grid gap-2 px-3 py-3 md:grid-cols-[160px_minmax(0,1fr)]">
                <div className="space-y-1 text-xs text-[var(--app-subtle)]">
                  <div>{item.source}</div>
                  <div>{item.dateRange}</div>
                  {item.publishDate ? <div>{formatDate(item.publishDate)}</div> : null}
                </div>

                <div className="min-w-0 space-y-2">
                  <h2 className="text-sm font-semibold leading-snug text-[var(--app-text)]">
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[var(--app-link)] hover:underline focus-visible:app-focus"
                      >
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </h2>

                  {item.doi ? (
                    <a
                      href={`https://doi.org/${item.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-xs text-[var(--app-link)] hover:underline focus-visible:app-focus"
                    >
                      DOI: {item.doi}
                    </a>
                  ) : null}

                  <p className="text-sm leading-relaxed text-[var(--app-muted)]">
                    {truncateText(item.summary, 260)}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleKeywordFilter(tag)}
                        className="rounded-md border px-1 py-px text-[8px] uppercase tracking-[0.04em] transition hover:brightness-95"
                        style={getTagPillStyle(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-10 text-center text-sm text-[var(--app-muted)]">
          Tidak ada riset yang cocok dengan filter pencarian.
        </section>
      )}
    </EditorialPageShell>
  );
}
