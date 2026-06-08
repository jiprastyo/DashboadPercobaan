'use client';

import React, { useState, useMemo } from 'react';
import type { ResearchFinding } from '@/data/research';

interface RisetAkademikClientProps {
  initialData: ResearchFinding[];
}

export default function RisetAkademikClient({ initialData }: RisetAkademikClientProps) {
  const [search, setSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 1. Extract unique sources
  const allSources = useMemo(() => {
    return Array.from(new Set(initialData.map((item) => item.source))).sort();
  }, [initialData]);

  // 2. Extract unique tags
  const allTags = useMemo(() => {
    return Array.from(new Set(initialData.flatMap((item) => item.tags))).sort();
  }, [initialData]);

  // 3. Handle tag toggle
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // 4. Reset all filters
  const resetFilters = () => {
    setSearch('');
    setSelectedSource('');
    setSelectedTags([]);
  };

  // 5. Filter data
  const filteredResearch = useMemo(() => {
    return initialData.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.summary.toLowerCase().includes(search.toLowerCase()) ||
        item.source.toLowerCase().includes(search.toLowerCase());

      const matchesSource = !selectedSource || item.source === selectedSource;

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((t) => item.tags.includes(t));

      return matchesSearch && matchesSource && matchesTags;
    });
  }, [initialData, search, selectedSource, selectedTags]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search Input */}
          <div className="w-full md:flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Cari Riset
            </label>
            <input
              type="text"
              placeholder="Cari judul, ringkasan, atau penerbit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2.5 border"
            />
          </div>

          {/* Source Dropdown Filter */}
          <div className="w-full md:w-72">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Sumber / Penerbit
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2.5 border bg-white"
            >
              <option value="">Semua Sumber</option>
              {allSources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clickable Tag Pills */}
        <div>
          <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Filter Topik / Tag
          </span>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => {
              const isActive = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Status / Count */}
      <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
        <span>Menampilkan {filteredResearch.length} dari {initialData.length} riset akademik</span>
        {(search || selectedSource || selectedTags.length > 0) && (
          <button 
            onClick={resetFilters} 
            className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 cursor-pointer border-0 bg-transparent"
          >
            Bersihkan Filter ✕
          </button>
        )}
      </div>

      {/* Research List */}
      {filteredResearch.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-100 overflow-hidden">
          {filteredResearch.map((item) => (
            <div 
              key={item.id} 
              className="p-6 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row md:items-start gap-4 md:gap-6"
            >
              {/* Left Column: Source badge and publication dates */}
              <div className="flex md:flex-col md:w-48 flex-shrink-0 justify-between md:justify-start items-center md:items-start gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7] break-all max-w-[150px] md:max-w-none text-center">
                  {item.source}
                </span>
                <div className="text-xs text-gray-500 font-medium md:mt-1 flex flex-col items-end md:items-start gap-1">
                  <span>
                    Tahun Publikasi: {item.dateRange}
                  </span>
                  {item.publishDate && (
                    <span className="text-[11px] text-gray-400">
                      Rilis: {new Date(item.publishDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: Title, DOI, Summary, and Tags */}
              <div className="flex-1 min-w-0 space-y-2.5">
                <h2 className="text-base font-semibold text-gray-900 leading-snug">
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-[#0D9488] hover:underline">
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </h2>

                {item.doi && (
                  <div className="flex items-center gap-2">
                    <a href={`https://doi.org/${item.doi}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-mono">
                      🔗 DOI: {item.doi}
                    </a>
                  </div>
                )}

                <p className="text-sm text-gray-650 leading-relaxed">
                  {item.summary}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.tags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500 shadow-sm text-sm">
          Tidak ada riset akademik yang cocok dengan filter pencarian Anda.
        </div>
      )}
    </div>
  );
}
