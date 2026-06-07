'use client';

import { useState } from 'react';
import { formatNumber, formatDate } from '@/lib/utils';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ASEANHistoricalData } from '@/lib/data-loader-server';
import { PROVINCES } from '@/lib/constants';
import StatCard from '@/components/cards/StatCard';

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
  bpsSource: string;
  provinsiData: any[];
  provinsiSource: string;
  pmiData: any[];
  phkData: any[];
  historicalData: ASEANHistoricalData | null;
  historicalIhkTradeData: any[];
  wismanData: any[];
}

export default function MakroIndonesiaClient({ 
  bpsData, 
  bpsSource,
  provinsiData,
  provinsiSource,
  pmiData, 
  phkData, 
  historicalData,
  historicalIhkTradeData,
  wismanData
}: MakroIndonesiaClientProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>('00'); // 00 for National

  // 1. Official Data Graph (Removed per request)
  const indoChartData: any[] = [];

  // 2. Filter PHK Timeline by selected province
  const filteredPhk = selectedProvince === '00' 
    ? phkData 
    : phkData.filter(d => d.province_code === selectedProvince);

  // IHK line chart data
  const ihkDataToUse = historicalIhkTradeData && historicalIhkTradeData.length > 0 ? historicalIhkTradeData : bpsData;
  const ihkData = ihkDataToUse
    .filter((d: any) => d.indicator === 'ihk')
    .map((d: any) => ({
      period: d.period,
      IHK: d.value,
      'Inflasi MtM (%)': d.change_mom,
    }));

  // Ekspor/Impor bar chart data
  const tradeDataToUse = historicalIhkTradeData && historicalIhkTradeData.length > 0 ? historicalIhkTradeData : bpsData;
  const tradePeriods = Array.from(new Set(
    tradeDataToUse
      .filter((d: any) => d.indicator === 'ekspor' || d.indicator === 'impor')
      .map((d: any) => d.period)
  )); // Get all periods
  
  const tradeData = tradePeriods.map((period) => {
    const eksporItem = tradeDataToUse.find((d: any) => d.indicator === 'ekspor' && d.period === period);
    const imporItem = tradeDataToUse.find((d: any) => d.indicator === 'impor' && d.period === period);
    return {
      period,
      Ekspor: eksporItem ? (eksporItem.value / 1e9) : 0,
      Impor: imporItem ? (imporItem.value / 1e9) : 0,
    };
  });

  // Wisman data
  const wismanChartData = wismanData.map((d: any) => ({
    period: d.period,
    'Kunjungan': d.value,
    'YoY (%)': d.change_yoy
  }));

  // Extract only the latest single Export and latest single Import record for summary cards
  const latestEkspor = bpsData.find((d) => d.indicator === 'ekspor');
  const latestImpor = bpsData.find((d) => d.indicator === 'impor');
  const eksporData = [latestEkspor, latestImpor].filter(Boolean) as any[];

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

  // Find TPT data for the currently selected province
  const selectedProvRecord = provinsiData.find(p => p.province_code === selectedProvince);
  let tptValue = 'N/A';
  let tptChange = undefined;
  
  if (selectedProvRecord) {
    tptValue = selectedProvRecord.tpt_feb_26 !== null ? `${selectedProvRecord.tpt_feb_26}%` : 'N/A';
    if (selectedProvRecord.tpt_feb_26 !== null && selectedProvRecord.tpt_feb_25 !== null) {
      const diff = parseFloat((selectedProvRecord.tpt_feb_26 - selectedProvRecord.tpt_feb_25).toFixed(2));
      tptChange = {
        value: diff,
        label: `${diff > 0 ? '+' : ''}${diff}% dibanding Feb 2025`,
        // unemployment increase is bad (direction 'down' for red), decrease is good (direction 'up' for green)
        direction: diff > 0 ? ('down' as const) : diff < 0 ? ('up' as const) : ('neutral' as const)
      };
    }
  }

  const showWarning = bpsSource === 'static_seed' || provinsiSource === 'fallback_spreadsheet';

  return (
    <div className="space-y-4">
      {/* Fallback Warnings */}
      {showWarning && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md mb-4 text-sm text-amber-800 shadow-sm">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-semibold block">Pemberitahuan Sumber Data Cadangan (Fallback Active)</span>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                {bpsSource === 'static_seed' && '• Menampilkan data indikator nasional (IHK, Ekspor, Impor) dari cadangan statis lokal karena API BPS tidak terjangkau.'}
                {bpsSource === 'static_seed' && provinsiSource === 'fallback_spreadsheet' && <br />}
                {provinsiSource === 'fallback_spreadsheet' && '• Menampilkan data TPT tingkat provinsi dari Google Spreadsheet cadangan karena API BPS tidak terjangkau.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Province Selector Dropdown & TPT Stat Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-end">
        <div className="lg:col-span-2 flex flex-col space-y-2">
          <label htmlFor="province-select" className="text-sm font-medium text-gray-700">Filter Wilayah Provinsi:</label>
          <select
            id="province-select"
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2.5 border bg-white"
          >
            <option value="00">Nasional (Semua Provinsi)</option>
            {PROVINCES.map((prov) => (
              <option key={prov.code} value={prov.code}>
                {prov.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* TPT/TPAK Historical Graph Removed */}

      {selectedProvince !== '00' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm text-amber-800">
          <strong>Perhatian:</strong> Filter provinsi saat ini hanya berlaku untuk <strong>Timeline PHK</strong> dan <strong>TPT Terkini</strong>.
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

      {/* Wisman */}
      {wismanChartData.length > 0 && (
        <CollapsibleSection title="Kunjungan Wisatawan Mancanegara">
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              Tren jumlah kunjungan wisatawan mancanegara ke Indonesia.
            </p>
            <LineChart
              data={wismanChartData}
              xKey="period"
              lines={[
                { dataKey: 'Kunjungan', label: 'Kunjungan Wisman', color: '#8B5CF6' },
              ]}
              height={320}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-50 p-3 rounded-md text-xs">
                <span className="font-semibold text-gray-700 block mb-1">Arti Indikator</span>
                <p className="text-gray-600">Jumlah kunjungan warga negara asing ke wilayah Indonesia untuk tujuan wisata atau lainnya dalam periode tertentu.</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md text-xs">
                <span className="font-semibold text-gray-700 block mb-1">Sumber Data</span>
                <p className="text-gray-600">Badan Pusat Statistik (BPS)</p>
                <a href="https://www.bps.go.id/subject/16/pariwisata.html" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mt-1 inline-block">Verifikasi Sumber ↗</a>
              </div>
              <div className="bg-gray-50 p-3 rounded-md text-xs">
                <span className="font-semibold text-gray-700 block mb-1">Periode Sumber Data</span>
                <p className="text-gray-600">Data bulanan, rilis bulan berikutnya.</p>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}

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
