import React from 'react';
import { getAcademicResearch } from '@/data/research';
import RisetAkademikClient from './RisetAkademikClient';

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

      <RisetAkademikClient initialData={academicResearch} />
    </div>
  );
}
