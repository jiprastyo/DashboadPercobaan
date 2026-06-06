'use client';

import { useState } from 'react';
import { SURVEY_PERIODS } from '@/lib/constants';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { FileText, Download, Eye, Printer } from 'lucide-react';

const REPORT_SECTIONS = [
  { id: 'ihk', label: 'Inflasi & IHK', checked: true },
  { id: 'trade', label: 'Neraca Perdagangan', checked: true },
  { id: 'pmi', label: 'PMI Manufaktur', checked: true },
  { id: 'phk', label: 'Timeline PHK', checked: true },
  { id: 'asean', label: 'Perbandingan ASEAN', checked: false },
  { id: 'trends', label: 'Tren Pencarian', checked: false },
  { id: 'news', label: 'Berita Terkait', checked: true },
  { id: 'ops', label: 'Status Operasional', checked: false },
];

export default function LaporanPage() {
  const [period, setPeriod] = useState(SURVEY_PERIODS[0].id);
  const [sections, setSections] = useState(
    REPORT_SECTIONS.map((s) => ({ ...s }))
  );

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s))
    );
  };

  const selectedCount = sections.filter((s) => s.checked).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config */}
        <div className="space-y-4">
          {/* Period Selector */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Periode Laporan</h2>
            <Select
              options={SURVEY_PERIODS.map((p) => ({
                value: p.id,
                label: p.label,
              }))}
              value={period}
              onChange={setPeriod}
            />
            <p className="text-xs text-gray-400 mt-2">
              Survei: {SURVEY_PERIODS.find((p) => p.id === period)?.survey_month}
              <br />
              Rilis: {SURVEY_PERIODS.find((p) => p.id === period)?.release_month}
            </p>
          </div>

          {/* Section Checklist */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Bagian Laporan</h2>
              <span className="text-xs text-gray-400">{selectedCount}/{sections.length} dipilih</span>
            </div>
            <div className="space-y-2">
              {sections.map((section) => (
                <label
                  key={section.id}
                  className="flex items-center gap-3 py-1.5 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={section.checked}
                    onChange={() => toggleSection(section.id)}
                    className="w-4 h-4 rounded border-gray-300 text-[#0D9488] focus:ring-[#0D9488]/30 cursor-pointer accent-[#0D9488]"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {section.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-2 no-print">
            <Button onClick={handlePrint} className="w-full">
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </Button>
            <Button variant="outline" className="w-full" disabled>
              <Download className="w-4 h-4" />
              Ekspor XLSX (Segera)
            </Button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#0D9488]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Laporan Monitoring Ketenagakerjaan
                </h2>
                <p className="text-sm text-gray-500">
                  Periode: {SURVEY_PERIODS.find((p) => p.id === period)?.label}
                </p>
              </div>
            </div>

            {/* Preview Sections */}
            <div className="space-y-6">
              {sections.filter((s) => s.checked).map((section) => (
                <div key={section.id} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    {section.label}
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-200">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Eye className="w-4 h-4" />
                      <span>
                        Konten {section.label.toLowerCase()} akan ditampilkan di sini saat data tersedia.
                      </span>
                    </div>
                    {/* Placeholder content blocks */}
                    <div className="mt-3 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-5/6" />
                      <div className="h-3 bg-gray-200 rounded w-4/6" />
                    </div>
                  </div>
                </div>
              ))}

              {selectedCount === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Pilih minimal satu bagian untuk pratinjau laporan.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
              <p>Digenerate oleh Dashboard Monitoring Ketenagakerjaan</p>
              <p>Sumber data: BPS, Bank Indonesia, Kemenaker, Google Trends, Media Nasional</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
