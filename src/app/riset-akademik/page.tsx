import React from 'react';
import { academicResearch } from '@/data/research';

export const metadata = {
  title: 'Riset Akademik Ketenagakerjaan',
  description: 'Temuan riset akademik terkini mengenai pasar kerja dan ketenagakerjaan di Indonesia (2020-2026).',
};

export default function RisetAkademikPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Riset Akademik & Kajian Institusi</h1>
        <p className="text-sm text-gray-500">
          Kompilasi temuan riset dan laporan terbaru (2020-2026) terkait dinamika ketenagakerjaan, 
          ekonomi gig, transisi pekerjaan hijau, dan fenomena pengangguran di Indonesia.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {academicResearch.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7]">
                {item.source}
              </span>
              <span className="text-xs text-gray-400 font-medium">{item.dateRange}</span>
            </div>
            
            <h2 className="text-lg font-semibold text-gray-900 mb-3 leading-snug">
              {item.link ? (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-[#0D9488] hover:underline">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </h2>
            
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {item.summary}
            </p>
            
            <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-gray-100">
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
        ))}
      </div>
    </div>
  );
}
