import React from 'react';
import { getAcademicResearch } from '@/data/research';

export const metadata = {
  title: 'Riset Akademik Ketenagakerjaan',
  description: 'Temuan riset akademik terkini mengenai pasar kerja dan ketenagakerjaan di Indonesia (2020-2026).',
};

export default async function RisetAkademikPage() {
  const academicResearch = await getAcademicResearch();
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Riset Akademik & Kajian Institusi</h1>
        <p className="text-sm text-gray-500">
          Kompilasi temuan riset dan laporan terbaru (2020-2026) terkait dinamika ketenagakerjaan, 
          ekonomi gig, transisi pekerjaan hijau, dan fenomena pengangguran di Indonesia.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-100 overflow-hidden">
        {academicResearch.map((item) => (
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
    </div>
  );
}
