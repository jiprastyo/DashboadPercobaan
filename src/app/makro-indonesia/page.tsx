'use client';

import { useState } from 'react';
import { getSampleBPSData, getSamplePMIData, getSamplePHKData } from '@/lib/data-loader';
import { formatNumber, formatDate } from '@/lib/utils';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import { ChevronDown, ChevronUp } from 'lucide-react';

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
      >
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export default function MakroIndonesiaPage() {
  const bpsData = getSampleBPSData();
  const pmiData = getSamplePMIData();
  const phkData = getSamplePHKData();

  // IHK line chart data
  const ihkData = bpsData
    .filter((d) => d.indicator === 'ihk')
    .reverse()
    .map((d) => ({
      period: d.period,
      IHK: d.value,
      'Inflasi MtM (%)': d.change_mom,
    }));

  // Ekspor/Impor bar chart data
  const eksporData = bpsData.filter((d) => d.indicator === 'ekspor' || d.indicator === 'impor');
  const tradeData = [
    {
      period: 'April 2026',
      Ekspor: 24.18,
      Impor: 19.87,
    },
  ];

  // PMI line chart data
  const pmiChartData = pmiData
    .slice()
    .reverse()
    .map((d) => ({
      period: d.period,
      PMI: d.pmi_value,
      Output: d.sub_indices?.output || 0,
      'Pesanan Baru': d.sub_indices?.new_orders || 0,
      'Tenaga Kerja': d.sub_indices?.employment || 0,
    }));

  // PHK timeline
  const phkTimeline = phkData
    .slice()
    .reverse()
    .map((d) => ({
      tanggal: formatDate(d.date),
      'Pekerja Terdampak': d.workers_affected || 0,
      label: d.title,
    }));

  return (
    <div className="space-y-4">
      {/* IHK */}
      <CollapsibleSection title="Indeks Harga Konsumen (IHK)">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Tren IHK dan inflasi bulanan (month-to-month) berdasarkan data BPS.
            {' '}
            <a href="https://www.bps.go.id/id/pressrelease" target="_blank" rel="noopener noreferrer" className="text-[#0D9488] hover:underline">Lihat Sumber Data ↗</a>
          </p>
          <LineChart
            data={ihkData}
            xKey="period"
            lines={[
              { dataKey: 'IHK', label: 'IHK', color: '#0D9488' },
              { dataKey: 'Inflasi MtM (%)', label: 'Inflasi MtM (%)', color: '#F59E0B', strokeDasharray: '5 5' },
            ]}
            height={320}
          />
        </div>
      </CollapsibleSection>

      {/* Ekspor/Impor */}
      <CollapsibleSection title="Neraca Perdagangan (Ekspor & Impor)">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Perbandingan nilai ekspor dan impor dalam miliar USD.
            {' '}
            <a href="https://www.bps.go.id/id/pressrelease" target="_blank" rel="noopener noreferrer" className="text-[#0D9488] hover:underline">Lihat Sumber Data ↗</a>
          </p>
          <BarChart
            data={tradeData}
            xKey="period"
            bars={[
              { dataKey: 'Ekspor', label: 'Ekspor (USD M)', color: '#0D9488' },
              { dataKey: 'Impor', label: 'Impor (USD M)', color: '#F59E0B' },
            ]}
            showLegend
            height={280}
            barSize={48}
          />
          <div className="grid grid-cols-2 gap-4 mt-4">
            {eksporData.map((d) => (
              <div key={d.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-medium">{d.indicator}</p>
                <p className="text-lg font-semibold text-gray-900">
                  US${formatNumber((d.value || 0) / 1e9, 2)} M
                </p>
                <p className="text-xs text-gray-500">{d.period}</p>
                {d.change_yoy !== undefined && (
                  <p className={`text-xs font-medium mt-1 ${d.change_yoy >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {d.change_yoy >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(d.change_yoy), 2)}% YoY
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* PMI */}
      <CollapsibleSection title="PMI Manufaktur">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Purchasing Managers&apos; Index dari Bank Indonesia. Nilai di atas 50 menandakan ekspansi.
            {' '}
            <a href="https://www.bi.go.id" target="_blank" rel="noopener noreferrer" className="text-[#0D9488] hover:underline">Lihat Sumber Data ↗</a>
          </p>
          <LineChart
            data={pmiChartData}
            xKey="period"
            lines={[
              { dataKey: 'PMI', label: 'PMI Komposit', color: '#0D9488' },
              { dataKey: 'Output', label: 'Output', color: '#3B82F6' },
              { dataKey: 'Tenaga Kerja', label: 'Tenaga Kerja', color: '#F59E0B' },
            ]}
            height={320}
            referenceLine={{ y: 50, label: 'Ekspansi/Kontraksi', color: '#EF4444' }}
            yDomain={[48, 55]}
          />
        </div>
      </CollapsibleSection>

      {/* PHK Timeline */}
      <CollapsibleSection title="Timeline PHK" defaultOpen={false}>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Kronologi pemutusan hubungan kerja berdasarkan laporan Kemenaker.
            {' '}
            <a href="https://kemnaker.go.id" target="_blank" rel="noopener noreferrer" className="text-[#0D9488] hover:underline">Lihat Sumber Data ↗</a>
          </p>
          <BarChart
            data={phkTimeline}
            xKey="tanggal"
            bars={[
              { dataKey: 'Pekerja Terdampak', label: 'Pekerja Terdampak', color: '#EF4444' },
            ]}
            height={260}
          />
          {/* Detail Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Judul</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Sektor</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Pekerja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {phkData.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">{formatDate(d.date)}</td>
                    <td className="py-2.5 px-3 text-gray-900 font-medium">
                      {d._source_url ? (
                        <a href={d._source_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#0D9488] hover:underline">
                          {d.title}
                        </a>
                      ) : (
                        d.title
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">{d.sector || '-'}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-gray-900">
                      {d.workers_affected ? formatNumber(d.workers_affected) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
