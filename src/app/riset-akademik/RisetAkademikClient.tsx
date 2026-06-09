'use client';

import React, { useMemo, useState } from 'react';
import type { ResearchFinding } from '@/data/research';
import SearchBar from '@/components/ui/SearchBar';
import FilterGroup from '@/components/ui/FilterGroup';
import { formatDate, truncateText } from '@/lib/utils';

interface RisetAkademikClientProps {
  initialData: ResearchFinding[];
}

export default function RisetAkademikClient({ initialData }: RisetAkademikClientProps) {
  const [search, setSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allSources = useMemo(() => Array.from(new Set(initialData.map((item) => item.source))).sort(), [initialData]);
  const allTags = useMemo(() => Array.from(new Set(initialData.flatMap((item) => item.tags))).sort(), [initialData]);

  const resetFilters = () => {
    setSearch('');
    setSelectedSource('');
    setSelectedTags([]);
  };

  const filteredResearch = useMemo(() => {
    return initialData.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.summary.toLowerCase().includes(search.toLowerCase()) ||
        item.source.toLowerCase().includes(search.toLowerCase());
      const matchesSource = !selectedSource || item.source === selectedSource;
      const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => item.tags.includes(tag));
      return matchesSearch && matchesSource && matchesTags;
    });
  }, [initialData, search, selectedSource, selectedTags]);

  return (
    <div className="space-y-4">
      <section className="border border-[var(--app-border)] bg-[var(--app-surface)]">
        <div className="border-b border-[var(--app-border)] px-3 py-3">
          <h1 className="text-lg font-semibold text-[var(--app-text)]">Riset akademik</h1>
        </div>
        <div className="space-y-4 p-3">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
            <SearchBar
              placeholder="Cari judul, ringkasan, atau penerbit"
              value={search}
              onChange={setSearch}
            />

            <div className="border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3">
              <label className="mb-2 block text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">
                Sumber
              </label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-sm text-[var(--app-text)] focus:border-[var(--app-link)] focus:outline-none"
              >
                <option value="">Semua sumber</option>
                {allSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FilterGroup
            label="Tag"
            options={allTags.map((tag) => ({ id: tag, label: tag }))}
            selected={selectedTags}
            onChange={setSelectedTags}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--app-muted)]">
            <span>
              Menampilkan {filteredResearch.length} dari {initialData.length} entri
            </span>
            {search || selectedSource || selectedTags.length > 0 ? (
              <button
                type="button"
                onClick={resetFilters}
                className="border border-[var(--app-border)] px-2.5 py-1 text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)] focus-visible:app-focus"
              >
                Bersihkan filter
              </button>
            ) : null}
          </div>
        </div>
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
                      <span
                        key={tag}
                        className="border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-[var(--app-muted)]"
                      >
                        {tag}
                      </span>
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
    </div>
  );
}
