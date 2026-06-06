'use client';

import { useState } from 'react';
import { formatNumber, formatDate } from '@/lib/utils';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ASEANHistoricalData } from '@/lib/data-loader-server';
import { PROVINCES } from '@/lib/constants';

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

interface MakroIndonesiaClientProps {
  bpsData: any[];
  pmiData: any[];
  phkData: any[];
  historicalData: ASEANHistoricalData | null;
}

export default function MakroIndonesiaClient({ bpsData, pmiData, phkData, historicalData }: MakroIndonesiaClientProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>('00'); // 00 for National

  // 1. Official Data Graph (Pengangguran & TPAK from 2024)
  let indoChartData: any[] = [];
  if (historicalData) {
    const indoHist = historicalData.countries.find(c => c.countryName === 'Indonesia');
    if (indoHist) {
      const uemData = indoHist.indicators['SL.UEM.TOTL.ZS']?.values || [];
      const lfprData = indoHist.indicators['SL.TLF.CACT.ZS']?.values || [];
      
      const years = Array.from(new Set([...uemData.map(d => d.year), ...lfprData.map(d => d.year)]))
        .filter(y => parseInt(y) >= 2024)
        .sort();
        
      indoChartData = years.map(year => ({
        year,
        'Pengangguran (%)': uemData.find(d => d.year === year)?.value || null,
        'TPAK (%)': lfprData.find(d => d.year === year)?.value || null,
      }));
    }
  }

  // 2. Filter PHK Timeline by selected province
  // Note: we'll assume phkData has a `province_code` property (we will add it in the scraper).
  // If `selectedProvince` == '00', show all (National).
  const filteredPhk = selectedProvince === '00' 
    ? phkData 
    : phkData.filter(d => d.province_code === selectedProvince);

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
  const phkTimeline = filteredPhk
    .slice()
    .reverse()
    .map((d) => ({
      tanggal: formatDate(d.date),
      'Pekerja Terdampak': d.workers_affected || 0,
      label: d.title,
    }));

  return (
    <div className="space-y-4">
      {/* Province Selector Dropdown */}
      <div className="flex items-center justify-end space-x-3 mb-4">
        <label htmlFor="province-select" className="text-sm font-medium text-gray-700">Filter Provinsi:</label>
        <select
          id="province-select"
          value={selectedProvince}
          onChange={(e) => setSelectedProvince(e.target.value)}
          className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border bg-white"
        >
          <option value="00">Nasional (Semua Provinsi)</option>
          {PROVINCES.map((prov) => (
            <option key={prov.code} value={prov.code}>
              {prov.name}
            </option>
          ))}
        </select>
      </div>

      {/* Official Data Graph */}
      {indoChartData.length > 0 && selectedProvince === '00' && (
        <CollapsibleSection title="Tren Pengangguran dan TPAK Resmi (Sejak 2024)">
          <div className="space-y-4">
            <LineChart
              data={indoChartData}
              xKey="year"
              lines={[
                { dataKey: 'Pengangguran (%)', label: 'Pengangguran (%)', color: '#EF4444' },
                { dataKey: 'TPAK (%)', label: 'TPAK (%)', color: '#0D9488' }
              ]}
              height={320}
            />
            {/* Notes Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-50 p-3 rounded-md text-xs">
                <span className="font-semibold text-gray-700 block mb-1">Arti Indikator</span>
                <p className="text-gray-600">
                  <strong>Pengangguran:</strong> Persentase angkatan kerja yang tidak memiliki pekerjaan tetapi sedang mencari kerja.<br/>
                  <strong>TPAK:</strong> Persentase penduduk usia kerja (15+ tahun) yang aktif secara ekonomi.
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md text-xs">
                <span className="font-semibold text-gray-700 block mb-1">Sumber Data</span>
                <p className="text-gray-600">
                  Data historis didapatkan dari World Bank yang mengompilasi rilis International Labour Organization (ILO) dan NSO (BPS).
                </p>
                <a href={historicalData?._source_url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mt-1 inline-block">Verifikasi Sumber ↗</a>
              </div>
              <div className="bg-gray-50 p-3 rounded-md text-xs">
                <span className="font-semibold text-gray-700 block mb-1">Periode Sumber Data</span>
                <p className="text-gray-600">
                  Data Tahunan 2024 hingga rilis terakhir 2025.
                </p>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {selectedProvince !== '00' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm text-amber-800">
          <strong>Perhatian:</strong> Data Resmi Pengangguran dan TPAK tingkat provinsi belum tersedia secara historis dari World Bank. Menampilkan data historis Nasional jika filter diatur ke "Nasional". Filter provinsi saat ini hanya berlaku untuk <strong>Timeline PHK</strong>.
        </div>
      )}

      {/* IHK */}
      <CollapsibleSection title="Indeks Harga Konsumen (IHK)">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Tren IHK dan inflasi bulanan (month-to-month) berdasarkan data BPS.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 p-3 rounded-md text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Arti Indikator</span>
              <p className="text-gray-600">Mengukur rata-rata perubahan harga sekumpulan barang dan jasa yang dikonsumsi rumahtangga. Angka MtM menunjukkan inflasi bulanan.</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Sumber Data</span>
              <p className="text-gray-600">Badan Pusat Statistik (BPS)</p>
              <a href="https://www.bps.go.id/id/pressrelease" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mt-1 inline-block">Verifikasi Sumber ↗</a>
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Periode Sumber Data</span>
              <p className="text-gray-600">Data bulanan, dirilis pada awal bulan berikutnya.</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Ekspor/Impor */}
      <CollapsibleSection title="Neraca Perdagangan (Ekspor & Impor)">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Perbandingan nilai ekspor dan impor dalam miliar USD.
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
                <p className="text-xs text-gray-500">Rilis: {d.period}</p>
                {d.change_yoy !== undefined && (
                  <p className={`text-xs font-medium mt-1 ${d.change_yoy >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {d.change_yoy >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(d.change_yoy), 2)}% YoY
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 p-3 rounded-md text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Arti Indikator</span>
              <p className="text-gray-600">Nilai total ekspor dan impor barang Indonesia yang mengukur kinerja perdagangan internasional.</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Sumber Data</span>
              <p className="text-gray-600">Badan Pusat Statistik (BPS)</p>
              <a href="https://www.bps.go.id/id/pressrelease" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mt-1 inline-block">Verifikasi Sumber ↗</a>
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Periode Sumber Data</span>
              <p className="text-gray-600">Data bulanan, dirilis pada pertengahan bulan berikutnya.</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* PMI */}
      <CollapsibleSection title="PMI Manufaktur">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Purchasing Managers&apos; Index dari Bank Indonesia. Nilai di atas 50 menandakan ekspansi.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 p-3 rounded-md text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Arti Indikator</span>
              <p className="text-gray-600">Indeks yang mengukur arah tren ekonomi sektor manufaktur. Di atas 50 berarti ekspansi, di bawah 50 berarti kontraksi.</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Sumber Data</span>
              <p className="text-gray-600">Bank Indonesia (Survei Kegiatan Dunia Usaha) / S&P Global</p>
              <a href="https://www.bi.go.id" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mt-1 inline-block">Verifikasi Sumber ↗</a>
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Periode Sumber Data</span>
              <p className="text-gray-600">Data bulanan, rilis di awal bulan.</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* PHK Timeline */}
      <CollapsibleSection title={`Timeline PHK ${selectedProvince === '00' ? '(Nasional)' : '(Provinsi)'}`} defaultOpen={false}>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Kronologi pemutusan hubungan kerja berdasarkan laporan.
          </p>
          <BarChart
            data={phkTimeline}
            xKey="tanggal"
            bars={[
              { dataKey: 'Pekerja Terdampak', label: 'Pekerja Terdampak', color: '#EF4444' },
            ]}
            height={260}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-md text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Arti Indikator</span>
              <p className="text-gray-600">Jumlah tenaga kerja yang terkena PHK berdasarkan kompilasi pemberitaan resmi dan laporan instansi terkait.</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Sumber Data</span>
              <p className="text-gray-600">Kementerian Ketenagakerjaan (Kemenaker) & Pemberitaan Media Tersertifikasi</p>
              <a href="https://kemnaker.go.id" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mt-1 inline-block">Verifikasi Sumber ↗</a>
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Periode Sumber Data</span>
              <p className="text-gray-600">Data harian/berjalan yang direkap secara otomatis (Tahun 2024 - Sekarang).</p>
            </div>
          </div>
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
                {filteredPhk.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">Tidak ada data PHK untuk provinsi ini.</td>
                  </tr>
                ) : (
                  filteredPhk.map((d) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
