'use client';

import React, { useMemo, useState } from 'react';
import type { ResearchFinding } from '@/data/research';
import SearchBar from '@/components/ui/SearchBar';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import ActiveFilterChips from '@/components/ui/ActiveFilterChips';
import CompactChip from '@/components/ui/CompactChip';
import { formatDate, truncateText } from '@/lib/utils';
import EditorialPageShell from '@/components/layout/EditorialPageShell';

interface RisetAkademikClientProps {
  initialData: ResearchFinding[];
}

const TA_CATEGORY_OPTIONS: Array<{ id: NonNullable<ResearchFinding['taCategory']>; label: string }> = [
  { id: 'skripsi', label: 'Skripsi' },
  { id: 'tesis', label: 'Tesis' },
  { id: 'disertasi', label: 'Disertasi' },
  { id: 'paper_jurnal', label: 'Paper/Jurnal' },
  { id: 'lainnya', label: 'Lainnya' },
];

export default function RisetAkademikClient({ initialData }: RisetAkademikClientProps) {
  const [search, setSearch] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedTaCategories, setSelectedTaCategories] = useState<string[]>([]);

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
    setSelectedTaCategories([]);
  };

  const toggleKeywordFilter = (keyword: string) => {
    setSelectedKeywords((current) =>
      current.includes(keyword) ? current.filter((item) => item !== keyword) : [...current, keyword]
    );
  };

  const toggleSourceFilter = (source: string) => {
    setSelectedSources((current) =>
      current.includes(source) ? current.filter((item) => item !== source) : [...current, source]
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
      const matchesTaCategory =
        selectedTaCategories.length === 0 || selectedTaCategories.includes(item.taCategory || 'lainnya');
      return matchesSearch && matchesSource && matchesKeywords && matchesTaCategory;
    });
  }, [initialData, search, selectedSources, selectedKeywords, selectedTaCategories]);

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
    ...selectedTaCategories.map((category) => ({
      id: `ta-${category}`,
      label: `Kategori: ${TA_CATEGORY_OPTIONS.find((item) => item.id === category)?.label || category}`,
      onRemove: () => setSelectedTaCategories(selectedTaCategories.filter((item) => item !== category)),
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

          <MultiSelectDropdown
            options={TA_CATEGORY_OPTIONS.map((category) => ({ id: category.id, label: category.label }))}
            selected={selectedTaCategories}
            onChange={setSelectedTaCategories}
            placeholder="Kategori TA"
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
                  <button
                    type="button"
                    onClick={() => toggleSourceFilter(item.source)}
                    className="text-left font-medium text-[var(--app-text)] hover:text-[var(--app-link)] hover:underline focus-visible:app-focus"
                  >
                    {item.source}
                  </button>
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

                  <div className="flex flex-wrap gap-1">
                    <CompactChip onClick={() => setSelectedTaCategories((current) => {
                      const category = item.taCategory || 'lainnya';
                      return current.includes(category)
                        ? current.filter((selected) => selected !== category)
                        : [...current, category];
                    })}>
                      {TA_CATEGORY_OPTIONS.find((category) => category.id === (item.taCategory || 'lainnya'))?.label || 'Lainnya'}
                    </CompactChip>
                    {item.tags.map((tag) => (
                      <CompactChip key={tag} onClick={() => toggleKeywordFilter(tag)}>
                        {tag}
                      </CompactChip>
                    ))}
                  </div>

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
