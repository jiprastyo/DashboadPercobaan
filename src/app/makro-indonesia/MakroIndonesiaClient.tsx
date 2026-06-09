'use client';

import { useState, useMemo } from 'react';
import { formatNumber, formatDate, formatPercent } from '@/lib/utils';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import { ChevronDown, ChevronUp, Copy, Download, Info, BarChart3, TrendingUp, Plus, X, Table } from 'lucide-react';
import { ASEANHistoricalData } from '@/lib/data-loader-server';
import { PROVINCES } from '@/lib/constants';
import StatCard from '@/components/cards/StatCard';
import { exportChartAsPng } from '@/lib/chart-export';

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
  bpsTptHistoricalData: any[];
}

const PROVINCIAL_PERIODS = [
  { id: '2025-feb', label: 'Februari 2025', observationDate: '2025-02-01', observationLabel: 'Februari 2025' },
  { id: '2026-feb', label: 'Februari 2026', observationDate: '2026-02-01', observationLabel: 'Februari 2026' },
] as const;

const TPT_AXIS_MONTH_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatTptAxisTick(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return String(value ?? '');
  }
  const date = new Date(value);
  if (date.getUTCMonth() === 6 && date.getUTCDate() === 1) {
    return String(date.getUTCFullYear());
  }
  return TPT_AXIS_MONTH_FORMATTER.format(date);
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
  wismanData,
  bpsTptHistoricalData
}: MakroIndonesiaClientProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>('00'); // 00 for National
  const [selectedCoverages, setSelectedCoverages] = useState<string[]>(['00', '31', '32']); // Default: Nasional, DKI Jakarta, Jawa Barat
  const [viewType, setViewType] = useState<'timeline' | 'comparison' | 'long-term-chart' | 'comparison-table'>('timeline');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-feb');
  const [copyStatus, setCopyStatus] = useState<string>('');
  const [selectedDataSource, setSelectedDataSource] = useState<'bps' | 'wb'>('bps');

  const getCoverageLabel = (provCode: string) => {
    if (provCode === '00') {
      return 'Nasional';
    }
    return PROVINCES.find((province) => province.code === provCode)?.name || provCode;
  };

  const bpsTimelineData = useMemo(() => {
    return [...bpsTptHistoricalData]
      .map((point) => ({
        ...point,
        x: Date.parse(`${point.observation_date}T00:00:00Z`),
      }))
      .sort((a, b) => a.x - b.x);
  }, [bpsTptHistoricalData]);

  const nationalPeriodValues = useMemo(() => {
    return new Map<string, number | null>(
      PROVINCIAL_PERIODS.map((period) => {
        const matchingPoint = bpsTimelineData.find((point) => point.observation_date === period.observationDate);
        return [period.id, matchingPoint?.tpt ?? null] as const;
      })
    );
  }, [bpsTimelineData]);

  // Helper to resolve official BPS TPT value for a given province and period
  const getTptValue = (provCode: string, periodId: string): number | null => {
    if (provCode === '00') {
      return nationalPeriodValues.get(periodId) ?? null;
    }
    const record = provinsiData.find((province) => province.province_code === provCode);
    if (!record) return null;
    if (periodId === '2025-feb') return record.tpt_feb_25;
    if (periodId === '2026-feb') return record.tpt_feb_26;
    return null;
  };

  const LINE_COLORS = ['#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#10B981', '#6366F1'];

  const chartLines = useMemo(() => {
    return selectedCoverages.map((provCode, index) => {
      const label = getCoverageLabel(provCode);
      return {
        dataKey: label,
        label,
        color: LINE_COLORS[index % LINE_COLORS.length],
      };
    });
  }, [selectedCoverages]);

  const lineChartData = useMemo(() => {
    return bpsTimelineData.map((point) => {
      const dataRow: Record<string, any> = {
        x: point.x,
        period: point.axis_label,
        tooltipLabel: point.observation_label,
      };

      selectedCoverages.forEach((provCode) => {
        const label = getCoverageLabel(provCode);
        if (provCode === '00') {
          dataRow[label] = point.tpt;
          return;
        }

        const record = provinsiData.find((province) => province.province_code === provCode);
        if (!record) {
          dataRow[label] = null;
          return;
        }

        if (point.observation_date === '2025-02-01') {
          dataRow[label] = record.tpt_feb_25;
          return;
        }

        if (point.observation_date === '2026-02-01') {
          dataRow[label] = record.tpt_feb_26;
          return;
        }

        dataRow[label] = null;
      });

      return dataRow;
    });
  }, [bpsTimelineData, provinsiData, selectedCoverages]);

  // Get World Bank national values
  const indoWB = historicalData?.countries.find(
    c => c.countryName === 'Indonesia' || c.countryCode === 'ID'
  );
  const wbValues = indoWB?.indicators['SL.UEM.TOTL.ZS']?.values || [];
  const sortedWbValues = useMemo(() => {
    return [...wbValues].sort((a, b) => a.year.localeCompare(b.year));
  }, [wbValues]);

  // Determine actual data and lines to render in Line Chart based on selectedDataSource
  const activeLineChartData = useMemo(() => {
    if (selectedDataSource === 'wb') {
      return sortedWbValues.map((value) => ({
        x: Date.UTC(Number(value.year), 6, 1),
        period: value.year,
        tooltipLabel: `Tahunan ${value.year} (Bank Dunia)`,
        Nasional: value.value,
      }));
    }
    return lineChartData;
  }, [selectedDataSource, sortedWbValues, lineChartData]);

  const activeChartLines = useMemo(() => {
    if (selectedDataSource === 'wb') {
      return [{ dataKey: 'Nasional', label: 'Nasional (Bank Dunia)', color: '#3B82F6' }];
    }
    return chartLines;
  }, [selectedDataSource, chartLines]);

  // Generate data for bar chart (Comparison View)
  const barChartData = provinsiData
    .map((record) => {
      const val = getTptValue(record.province_code, selectedPeriod);
      return {
        code: record.province_code,
        name: record.province_name,
        'TPT (%)': val,
      };
    })
    .filter((item) => item['TPT (%)'] !== null)
    .sort((a, b) => (b['TPT (%)'] || 0) - (a['TPT (%)'] || 0));

  // Handle adding a region to line chart coverages
  const handleAddCoverage = (code: string) => {
    if (!selectedCoverages.includes(code)) {
      setSelectedCoverages([...selectedCoverages, code]);
    }
  };

  // Handle removing a region from line chart coverages
  const handleRemoveCoverage = (code: string) => {
    if (selectedCoverages.length > 1) {
      setSelectedCoverages(selectedCoverages.filter(c => c !== code));
    }
  };

  // Copy or download chart as PNG
  const handleCopyChart = async (downloadOnly = false) => {
    try {
      setCopyStatus(downloadOnly ? 'Mengunduh...' : 'Menyalin...');
      const result = await exportChartAsPng(
        'tpt-chart-container',
        `tpt-chart-${viewType}-${selectedPeriod}.png`,
        downloadOnly
      );
      if (!downloadOnly) {
        alert(
          result === 'clipboard'
            ? 'Grafik berhasil disalin ke clipboard sebagai PNG.'
            : 'Penyalinan clipboard dibatasi browser. Grafik telah diunduh sebagai PNG.'
        );
      }
      setCopyStatus('');
    } catch (err) {
      console.error('Error handling chart copy:', err);
      alert('Terjadi kesalahan saat memproses gambar.');
      setCopyStatus('');
    }
  };

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
    tptValue = selectedProvRecord.tpt_feb_26 !== null ? formatPercent(selectedProvRecord.tpt_feb_26, 2) : 'N/A';
    if (selectedProvRecord.tpt_feb_26 !== null && selectedProvRecord.tpt_feb_25 !== null) {
      const diff = parseFloat((selectedProvRecord.tpt_feb_26 - selectedProvRecord.tpt_feb_25).toFixed(2));
      tptChange = {
        value: diff,
        label: `${diff > 0 ? '+' : ''}${formatNumber(diff, 2)} pp dibanding Feb 2025`,
        // unemployment increase is bad (direction 'down' for red), decrease is good (direction 'up' for green)
        direction: diff > 0 ? ('down' as const) : diff < 0 ? ('up' as const) : ('neutral' as const)
      };
    }
  }

  // Construct BPS vs WB comparison series using exact BPS observation periods.
  const comparisonTableData = useMemo(() => {
    const indoWB = historicalData?.countries.find(
      c => c.countryName === 'Indonesia' || c.countryCode === 'ID'
    );
    const wbValues = indoWB?.indicators['SL.UEM.TOTL.ZS']?.values || [];
    return [...bpsTimelineData]
      .sort((a, b) => b.x - a.x)
      .map((point) => {
        const wbItem = wbValues.find((value) => value.year === point.year);
        const wbVal = wbItem ? wbItem.value : null;
        const diff = wbVal !== null ? parseFloat((point.tpt - wbVal).toFixed(2)) : null;

        return {
          period: point.observation_label,
          year: point.year,
          x: point.x,
          bpsVal: point.tpt,
          wbVal,
          diff,
        };
      });
  }, [bpsTimelineData, historicalData]);

  // Construct chronological comparison series (sorted ascending) for the long-term line chart
  const chronologicalComparisonData = useMemo(() => {
    return [...comparisonTableData].reverse();
  }, [comparisonTableData]);

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-stretch">
        <div className="lg:col-span-2 flex flex-col justify-end space-y-2 bg-white border border-gray-200 rounded-lg p-5">
          <label htmlFor="province-select" className="text-sm font-semibold text-gray-900">Filter Wilayah Provinsi (PHK & Ringkasan TPT):</label>
          <p className="text-xs text-gray-500 leading-relaxed">
            Pilih provinsi untuk menyinkronkan data detail ringkasan indikator TPT di kanan serta menyaring timeline peristiwa PHK di bawah.
          </p>
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
        <div className="lg:col-span-1">
          <StatCard
            title={`TPT Terkini (${selectedProvince === '00' ? 'Nasional' : provinsiData.find(p => p.province_code === selectedProvince)?.province_name || ''})`}
            value={tptValue}
            subtitle="Periode Rilis: Februari 2026"
            change={tptChange}
            info={{
              arti: 'Tingkat Pengangguran Terbuka (TPT) mengukur persentase jumlah penganggur terhadap jumlah angkatan kerja.',
              sumber: 'Badan Pusat Statistik (BPS - Sakernas)',
              periodik: 'Februari & Agustus'
            }}
          />
        </div>
      </div>

      {/* Interactive TPT Dashboard Section */}
      <CollapsibleSection title="Analisis Tingkat Pengangguran Terbuka (TPT) Sakernas" defaultOpen={true}>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* View Type Toggle */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-md">
                <button
                  onClick={() => setViewType('timeline')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${viewType === 'timeline' ? 'bg-white text-teal-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Tren Sakernas</span>
                </button>
                {selectedDataSource === 'bps' && (
                  <button
                    onClick={() => setViewType('comparison')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${viewType === 'comparison' ? 'bg-white text-teal-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Perbandingan Wilayah</span>
                  </button>
                )}
                <button
                  onClick={() => setViewType('long-term-chart')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${viewType === 'long-term-chart' ? 'bg-white text-teal-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>BPS vs Bank Dunia (Tren)</span>
                </button>
                <button
                  onClick={() => setViewType('comparison-table')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${viewType === 'comparison-table' ? 'bg-white text-teal-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>BPS vs Bank Dunia (Tabel)</span>
                </button>
              </div>

              {/* Data Source Selector */}
              {viewType !== 'comparison-table' && viewType !== 'long-term-chart' && (
                <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded-md">
                  <span className="text-[10px] font-bold text-gray-400 uppercase px-2">Sumber:</span>
                  <button
                    onClick={() => {
                      setSelectedDataSource('bps');
                    }}
                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${selectedDataSource === 'bps' ? 'bg-white text-teal-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    BPS Sakernas
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDataSource('wb');
                      if (viewType === 'comparison') setViewType('timeline');
                    }}
                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${selectedDataSource === 'wb' ? 'bg-white text-teal-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    Bank Dunia
                  </button>
                </div>
              )}
            </div>

            {/* Export Actions */}
            {viewType !== 'comparison-table' && (
              <div className="flex items-center space-x-2">
                <button
                  disabled={copyStatus !== ''}
                  onClick={() => handleCopyChart(false)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copyStatus === 'Menyalin...' ? 'Menyalin...' : 'Salin Grafik (PNG)'}</span>
                </button>
                <button
                  disabled={copyStatus !== ''}
                  onClick={() => handleCopyChart(true)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{copyStatus === 'Mengunduh...' ? 'Mengunduh...' : 'Unduh PNG'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Controls based on viewType */}
          {viewType !== 'comparison-table' && viewType !== 'long-term-chart' && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
              {viewType === 'timeline' ? (
                <>
                  {selectedDataSource === 'bps' ? (
                    <>
                      <div className="flex flex-col space-y-1 flex-1 min-w-[200px]">
                        <span className="text-xs font-semibold text-gray-700">Wilayah Pembanding:</span>
                        <div className="flex flex-wrap gap-2 items-center mt-1">
                          {selectedCoverages.map((code, idx) => {
                            const isNational = code === '00';
                            const name = isNational ? 'Nasional' : (PROVINCES.find(p => p.code === code)?.name || code);
                            const color = LINE_COLORS[idx % LINE_COLORS.length];
                            return (
                              <div
                                key={code}
                                className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs"
                                style={{
                                  borderColor: color,
                                  color: color,
                                  backgroundColor: `${color}10`
                                }}
                              >
                                <span>{name}</span>
                                {selectedCoverages.length > 1 && (
                                  <button
                                    onClick={() => handleRemoveCoverage(code)}
                                    className="hover:bg-gray-200 rounded-full p-0.5 transition-colors cursor-pointer ml-1"
                                    title="Hapus"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-2 md:mt-0">
                        <span className="text-xs font-semibold text-gray-700">Tambah Wilayah:</span>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddCoverage(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="rounded-md border-gray-300 shadow-xs focus:border-teal-500 focus:ring-teal-500 text-xs p-1.5 border bg-white cursor-pointer"
                        >
                          <option value="" disabled>Pilih Provinsi...</option>
                          <option value="00">Nasional</option>
                          {PROVINCES.filter(p => !selectedCoverages.includes(p.code)).map(p => (
                            <option key={p.code} value={p.code}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-blue-700 bg-blue-50/50 border border-blue-100 rounded-md p-2.5 w-full">
                      ℹ️ Data Bank Dunia (Model WB) hanya tersedia untuk tingkat <strong>Nasional</strong>.
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center space-x-2 w-full justify-between">
                  <span className="text-xs font-semibold text-gray-700">Pilih Periode Survei Sakernas:</span>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="rounded-md border-gray-300 shadow-xs focus:border-teal-500 focus:ring-teal-500 text-xs p-1.5 border bg-white cursor-pointer"
                  >
                    {PROVINCIAL_PERIODS.map(period => (
                      <option key={period.id} value={period.id}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Chart Wrapper Container (for PNG copy capture) or Comparison Table */}
          {viewType === 'comparison-table' ? (
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-2xs space-y-4">
              <h4 className="text-xs font-bold text-gray-600 uppercase mb-3 text-center tracking-wide">
                Perbandingan Seri Data Pengangguran: BPS Resmi vs Bank Dunia (%)
              </h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-6 py-3 font-semibold text-gray-900">Periode BPS</th>
                      <th scope="col" className="px-6 py-3 font-semibold text-gray-900 text-right">BPS Resmi (Sakernas)</th>
                      <th scope="col" className="px-6 py-3 font-semibold text-gray-900 text-right">Bank Dunia (Model WB)</th>
                      <th scope="col" className="px-6 py-3 font-semibold text-gray-900 text-right">Selisih (pp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {comparisonTableData.map((row) => (
                      <tr key={row.period} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{row.period}</td>
                        <td className="px-6 py-2.5 text-right font-medium text-gray-800">
                          {row.bpsVal !== null ? `${formatNumber(row.bpsVal, 2)}%` : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-6 py-2.5 text-right font-medium text-gray-800">
                          {row.wbVal !== null ? `${formatNumber(row.wbVal, 2)}%` : <span className="text-gray-300">-</span>}
                        </td>
                        <td className={`px-6 py-2.5 text-right font-semibold ${row.diff !== null ? (row.diff > 0 ? 'text-amber-600' : 'text-emerald-600') : 'text-gray-800'}`}>
                          {row.diff !== null ? `${row.diff > 0 ? '+' : ''}${formatNumber(row.diff, 2)} pp` : <span className="text-gray-300">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-xs text-blue-800 leading-relaxed space-y-2">
                <p className="font-semibold flex items-center gap-1.5 text-blue-900">
                  <Info className="w-4 h-4 text-blue-600" />
                  Mengapa Angka BPS dan Bank Dunia Berbeda?
                </p>
                <p>
                  1. **Metodologi Estimasi**: Bank Dunia menggunakan estimasi model terharmonisasi (ILO Modelled Estimates) untuk memastikan keterbandingan internasional antar negara, sedangkan BPS merilis angka resmi langsung dari Survei Angkatan Kerja Nasional (Sakernas).
                </p>
                <p>
                  2. **Periode Survei & Definisi**: Angka tahunan Bank Dunia disesuaikan untuk perbandingan global, sedangkan BPS menyajikan rata-rata periodik Sakernas di Indonesia. Perbedaan ini wajar terjadi karena penyesuaian definisi angkatan kerja internasional.
                </p>
              </div>
            </div>
          ) : (
            <div id="tpt-chart-container" className="bg-white p-3 border border-gray-100 rounded-lg shadow-2xs">
              {viewType === 'long-term-chart' ? (
                <>
                  <h4 className="text-xs font-bold text-gray-600 uppercase mb-3 text-center tracking-wide">
                    Perbandingan Tren TPT Jangka Panjang: BPS Resmi vs Bank Dunia (1986–2026) (%)
                  </h4>
                  <LineChart
                    data={chronologicalComparisonData}
                    xKey="x"
                    lines={[
                      { dataKey: 'bpsVal', label: 'BPS Resmi (Sakernas)', color: '#0D9488' },
                      { dataKey: 'wbVal', label: 'Bank Dunia (Model WB)', color: '#3B82F6' }
                    ]}
                    height={350}
                    yDomain={[0, 12]}
                    xType="number"
                    xDomain={['dataMin', 'dataMax']}
                    xTickFormatter={formatTptAxisTick}
                    tooltipLabelFormatter={(value) => {
                      const matchingPoint = chronologicalComparisonData.find((item) => item.x === value);
                      return matchingPoint ? matchingPoint.period : formatTptAxisTick(value);
                    }}
                    valueFormatter={(val) => `${formatNumber(Number(val), 2)}%`}
                  />
                </>
              ) : (
                <>
                  <h4 className="text-xs font-bold text-gray-600 uppercase mb-3 text-center tracking-wide">
                    {viewType === 'timeline'
                      ? `Tren Perkembangan TPT - ${selectedDataSource === 'bps' ? 'BPS Sakernas' : 'Bank Dunia (WB)'} (%)`
                      : `Peringkat TPT Provinsi - Periode ${PROVINCIAL_PERIODS.find(p => p.id === selectedPeriod)?.label || ''} (%)`}
                  </h4>
                  {viewType === 'timeline' ? (
                    <LineChart
                      data={activeLineChartData}
                      xKey="x"
                      lines={activeChartLines}
                      height={350}
                      yDomain={[0, 10]}
                      xType="number"
                      xDomain={['dataMin', 'dataMax']}
                      xTickFormatter={formatTptAxisTick}
                      tooltipLabelFormatter={(value) => {
                        const matchingPoint = activeLineChartData.find((item) => item.x === value);
                        return matchingPoint ? String(matchingPoint.tooltipLabel) : formatTptAxisTick(value);
                      }}
                      valueFormatter={(val) => `${formatNumber(Number(val), 2)}%`}
                    />
                  ) : (
                    <BarChart
                      data={barChartData}
                      xKey="name"
                      bars={[{ dataKey: 'TPT (%)', label: 'TPT (%)', color: '#3B82F6' }]}
                      height={400}
                      barSize={16}
                      showLegend={false}
                      highlightKey={selectedProvince === '00' ? 'Nasional' : provinsiData.find(p => p.province_code === selectedProvince)?.province_name || ''}
                      highlightColor="#0D9488"
                      valueFormatter={(val) => `${formatNumber(Number(val), 2)}%`}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Explanatory Footnotes */}
          {viewType !== 'comparison-table' && viewType !== 'long-term-chart' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 bg-gray-50 p-4 rounded-lg border border-gray-100 text-xs text-gray-600">
              <div>
                <span className="font-bold text-gray-800 block mb-1">Catatan Ketersediaan Data BPS Resmi:</span>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>Grafik tren BPS memakai seri resmi Sakernas sejak **1986**. Titik **1986-2004** dipetakan sebagai data tahunan, sedangkan **2005-2026** dipetakan pada bulan observasi resmi seperti **Februari** atau **Agustus**.</li>
                  <li>Data tingkat **Provinsi** BPS resmi hanya tersedia untuk periode **Februari 2025** dan **Februari 2026**.</li>
                  <li>Tahun **1995** tidak memiliki titik karena **Sakernas tidak dilaksanakan**. Periode provinsi lain yang belum dirilis resmi oleh BPS memang dibiarkan kosong.</li>
                </ul>
              </div>
              <div>
                <span className="font-bold text-gray-800 block mb-1">Definisi & Metodologi:</span>
                <p className="leading-relaxed">
                  Tingkat Pengangguran Terbuka (TPT) adalah indikator ketenagakerjaan resmi BPS yang diukur melalui Survei Angkatan Kerja Nasional (Sakernas). Angka TPT diperoleh dari perbandingan antara jumlah penganggur terhadap jumlah angkatan kerja aktif pada saat survei dilakukan.
                </p>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

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
