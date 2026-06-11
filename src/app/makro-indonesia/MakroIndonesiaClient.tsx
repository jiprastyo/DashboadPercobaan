'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatNumber, formatDate, formatPercent } from '@/lib/utils';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import { ChevronDown, ChevronUp, ArrowDownAZ, ArrowUpAZ, BarChart3, TrendingUp, X } from 'lucide-react';
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
    <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
      >
        <h2 className="text-base font-semibold text-[var(--app-text)]">{title}</h2>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[var(--app-subtle)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--app-subtle)]" />
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
  provinsiHistoricalData: any[];
  pmiData: any[];
  phkData: any[];
  historicalIhkTradeData: any[];
  wismanData: any[];
  bpsTptHistoricalData: any[];
}

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
  provinsiHistoricalData,
  pmiData, 
  phkData, 
  historicalIhkTradeData,
  wismanData,
  bpsTptHistoricalData
}: MakroIndonesiaClientProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>('00'); // 00 for National
  const [selectedCoverages, setSelectedCoverages] = useState<string[]>(['00', '31', '32']); // Default: Nasional, DKI Jakarta, Jawa Barat
  const [viewType, setViewType] = useState<'timeline' | 'comparison'>('timeline');
  const [comparisonSort, setComparisonSort] = useState<'desc' | 'asc'>('desc');

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

  const allObservationDates = useMemo(() => {
    return bpsTimelineData.map((point) => point.observation_date);
  }, [bpsTimelineData]);

  const latestObservationDate = allObservationDates[allObservationDates.length - 1] || '';
  const [selectedPeriod, setSelectedPeriod] = useState<string>(latestObservationDate);
  const [selectedTimelinePoints, setSelectedTimelinePoints] = useState<string[]>(allObservationDates);

  useEffect(() => {
    if (latestObservationDate && !selectedPeriod) {
      setSelectedPeriod(latestObservationDate);
    }
  }, [latestObservationDate, selectedPeriod]);

  useEffect(() => {
    if (allObservationDates.length > 0 && selectedTimelinePoints.length === 0) {
      setSelectedTimelinePoints(allObservationDates);
    }
  }, [allObservationDates, selectedTimelinePoints.length]);

  const timelinePointMeta = useMemo(() => {
    return new Map(
      bpsTimelineData.map((point) => [
        point.observation_date,
        {
          observationLabel: point.observation_label,
          axisLabel: point.axis_label,
        },
      ])
    );
  }, [bpsTimelineData]);

  const historicalProvinceLookup = useMemo(() => {
    return new Map(
      provinsiHistoricalData.map((point) => [
        `${point.province_code}|${point.observation_date}`,
        point.tpt,
      ])
    );
  }, [provinsiHistoricalData]);

  const getHistoricalTptValue = (provCode: string, observationDate: string): number | null => {
    if (provCode === '00') {
      return bpsTimelineData.find((point) => point.observation_date === observationDate)?.tpt ?? null;
    }
    return historicalProvinceLookup.get(`${provCode}|${observationDate}`) ?? null;
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
        observationDate: point.observation_date,
      };

      selectedCoverages.forEach((provCode) => {
        const label = getCoverageLabel(provCode);
        if (provCode === '00') {
          dataRow[label] = point.tpt;
          return;
        }

        dataRow[label] = historicalProvinceLookup.get(`${provCode}|${point.observation_date}`) ?? null;
      });

      return dataRow;
    });
  }, [bpsTimelineData, historicalProvinceLookup, selectedCoverages]);

  const activeLineChartData = useMemo(() => {
    return lineChartData.filter((point) => selectedTimelinePoints.includes(String(point.observationDate)));
  }, [lineChartData, selectedTimelinePoints]);

  const comparisonPeriods = useMemo(() => {
    return bpsTimelineData.map((point) => ({
      id: point.observation_date,
      label: point.observation_label,
    }));
  }, [bpsTimelineData]);

  const barChartData = useMemo(() => {
    const selectedPoint = timelinePointMeta.get(selectedPeriod);
    const nationalValue = getHistoricalTptValue('00', selectedPeriod);

    const rows = [
      {
        code: '00',
        name: 'Nasional',
        sortOrder: -1,
        periodLabel: selectedPoint?.observationLabel || selectedPeriod,
        'TPT (%)': nationalValue,
      },
      ...PROVINCES.map((province, index) => ({
        code: province.code,
        name: province.name,
        sortOrder: index,
        periodLabel: selectedPoint?.observationLabel || selectedPeriod,
        'TPT (%)': getHistoricalTptValue(province.code, selectedPeriod),
      })),
    ];

    return rows
      .filter((item) => item['TPT (%)'] !== null)
      .sort((left, right) => {
        const leftValue = Number(left['TPT (%)'] ?? 0);
        const rightValue = Number(right['TPT (%)'] ?? 0);

        if (comparisonSort === 'desc') {
          return rightValue - leftValue || left.sortOrder - right.sortOrder;
        }

        return leftValue - rightValue || left.sortOrder - right.sortOrder;
      });
  }, [comparisonSort, getHistoricalTptValue, selectedPeriod, timelinePointMeta]);

  const activeChartLines = chartLines;
  const selectedPeriodLabel = timelinePointMeta.get(selectedPeriod)?.observationLabel || selectedPeriod;

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

  const handleTimelinePointToggle = (observationDate: string) => {
    setSelectedTimelinePoints((current) => (
      current.includes(observationDate)
        ? current.filter((item) => item !== observationDate)
        : [...current, observationDate].sort()
    ));
  };

  const handleSelectAllTimelinePoints = () => {
    setSelectedTimelinePoints(allObservationDates);
  };

  const handleSelectRecentTimelinePoints = () => {
    setSelectedTimelinePoints(allObservationDates.slice(-12));
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
        <div className="lg:col-span-2 flex flex-col justify-end space-y-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
          <label htmlFor="province-select" className="text-sm font-semibold text-[var(--app-text)]">Filter Wilayah Provinsi (PHK & Ringkasan TPT):</label>
          <p className="text-xs leading-relaxed text-[var(--app-muted)]">
            Pilih provinsi untuk menyinkronkan data detail ringkasan indikator TPT di kanan serta menyaring timeline peristiwa PHK di bawah.
          </p>
          <select
            id="province-select"
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="block w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-2.5 text-[var(--app-text)] shadow-sm focus:border-[var(--app-link)] focus:ring-[var(--app-link)] sm:text-sm"
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
          <div className="flex flex-col gap-4 border-b border-[var(--app-border)] pb-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex space-x-1 rounded-md bg-[var(--app-bg-soft)] p-1">
                <button
                  onClick={() => setViewType('timeline')}
                  className={`flex cursor-pointer items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${viewType === 'timeline' ? 'bg-[var(--app-surface)] text-[var(--app-teal)] shadow-xs' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Tren Sakernas</span>
                </button>
                <button
                  onClick={() => setViewType('comparison')}
                  className={`flex cursor-pointer items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${viewType === 'comparison' ? 'bg-[var(--app-surface)] text-[var(--app-teal)] shadow-xs' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Perbandingan Wilayah</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-3">
            {viewType === 'timeline' ? (
              <>
                <div className="flex flex-col space-y-2">
                  <span className="text-xs font-semibold text-[var(--app-text)]">Wilayah Pembanding:</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    {selectedCoverages.map((code, idx) => {
                      const isNational = code === '00';
                      const name = isNational ? 'Nasional' : (PROVINCES.find((province) => province.code === code)?.name || code);
                      const color = LINE_COLORS[idx % LINE_COLORS.length];
                      return (
                        <div
                          key={code}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs"
                          style={{
                            borderColor: color,
                            color,
                            backgroundColor: `${color}10`,
                          }}
                        >
                          <span>{name}</span>
                          {selectedCoverages.length > 1 && (
                            <button
                              onClick={() => handleRemoveCoverage(code)}
                              className="ml-1 cursor-pointer rounded-full p-0.5 transition-colors hover:bg-[var(--app-border)]"
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
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold whitespace-nowrap text-[var(--app-text)]">Tambah Wilayah:</span>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddCoverage(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="cursor-pointer rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 text-xs text-[var(--app-text)] shadow-xs focus:border-[var(--app-link)] focus:ring-[var(--app-link)]"
                    >
                      <option value="" disabled>Pilih Provinsi...</option>
                      <option value="00">Nasional</option>
                      {PROVINCES.filter((province) => !selectedCoverages.includes(province.code)).map((province) => (
                        <option key={province.code} value={province.code}>{province.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--app-text)]">Titik Data yang Ditampilkan:</span>
                      <button
                        onClick={handleSelectAllTimelinePoints}
                        className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]"
                      >
                        Semua
                      </button>
                      <button
                        onClick={handleSelectRecentTimelinePoints}
                        className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]"
                      >
                        12 Terbaru
                      </button>
                      <span className="text-xs text-[var(--app-muted)]">
                        {selectedTimelinePoints.length} dari {allObservationDates.length} observasi dipilih
                      </span>
                    </div>
                    <div className="max-h-36 overflow-y-auto rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                        {comparisonPeriods.map((period) => (
                          <label key={period.id} className="flex items-center gap-2 text-xs text-[var(--app-text)]">
                            <input
                              type="checkbox"
                              checked={selectedTimelinePoints.includes(period.id)}
                              onChange={() => handleTimelinePointToggle(period.id)}
                              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span>{period.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <span className="text-xs font-semibold text-[var(--app-text)]">Pilih Periode Survei Sakernas:</span>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="cursor-pointer rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 text-xs text-[var(--app-text)] shadow-xs focus:border-[var(--app-link)] focus:ring-[var(--app-link)] md:min-w-[240px]"
                  >
                    {comparisonPeriods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex space-x-1 rounded-md bg-[var(--app-surface)] p-1">
                    <button
                      onClick={() => setComparisonSort('desc')}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${comparisonSort === 'desc' ? 'bg-[var(--app-bg-soft)] text-[var(--app-teal)]' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                    >
                      <ArrowDownAZ className="h-3.5 w-3.5" />
                      <span>TPT tertinggi</span>
                    </button>
                    <button
                      onClick={() => setComparisonSort('asc')}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${comparisonSort === 'asc' ? 'bg-[var(--app-bg-soft)] text-[var(--app-teal)]' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                    >
                      <ArrowUpAZ className="h-3.5 w-3.5" />
                      <span>TPT terendah</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div id="tpt-chart-container" className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-2xs">
            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
              {viewType === 'timeline'
                ? 'Tren Perkembangan TPT BPS Sakernas (1986-2026) (%)'
                : `Perbandingan Wilayah TPT BPS Sakernas - ${selectedPeriodLabel} (%)`}
            </h4>
            {viewType === 'timeline' ? (
              <LineChart
                data={activeLineChartData}
                xKey="x"
                lines={activeChartLines}
                height={350}
                yDomain={[0, 12]}
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
              <div className="space-y-2">
                <p className="text-center text-[11px] text-[var(--app-muted)]">
                  Sumbu horizontal memakai kode provinsi BPS, termasuk `00` untuk nasional.
                </p>
                <BarChart
                  data={barChartData}
                  xKey="code"
                  bars={[{ dataKey: 'TPT (%)', label: 'TPT (%)', color: '#3B82F6' }]}
                  height={420}
                  barSize={12}
                  showLegend={false}
                  highlightKey={selectedProvince}
                  highlightColor="#0D9488"
                  valueFormatter={(val) => `${formatNumber(Number(val), 2)}%`}
                  xTickAngle={-90}
                  xTickInterval={0}
                  xTickHeight={56}
                  xTickFontSize={10}
                />
              </div>
            )}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-4 text-xs text-[var(--app-muted)] md:grid-cols-2">
            <div>
              <span className="mb-1 block font-bold text-[var(--app-text)]">Catatan Ketersediaan Data BPS Resmi:</span>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Seluruh grafik TPT di panel ini memakai seri resmi BPS Sakernas sejak 1986 tanpa seri Bank Dunia.</li>
                <li>Titik waktu mengikuti tanggal observasi asli BPS: 1986-2004 ditampilkan sebagai observasi tahunan, sedangkan 2005-2026 memakai bulan rilis resmi seperti Februari dan Agustus.</li>
                <li>Data provinsi kini mengikuti observasi historis yang sama dengan grafik nasional. Provinsi baru akan mulai muncul sejak observasi resmi pertama yang tersedia di BPS.</li>
                <li>Tahun 1995 tidak memiliki titik karena Sakernas tidak dilaksanakan pada tahun tersebut.</li>
              </ul>
            </div>
            <div>
              <span className="mb-1 block font-bold text-[var(--app-text)]">Definisi & Metodologi:</span>
              <p className="leading-relaxed">
                Tingkat Pengangguran Terbuka (TPT) adalah indikator ketenagakerjaan resmi BPS yang diukur melalui Survei Angkatan Kerja Nasional (Sakernas). Angka TPT diperoleh dari perbandingan antara jumlah penganggur terhadap jumlah angkatan kerja aktif pada saat survei dilakukan.
              </p>
            </div>
          </div>
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
          <p className="text-sm text-[var(--app-muted)]">
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
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Arti Indikator</span>
              <p className="text-[var(--app-muted)]">Mengukur rata-rata perubahan harga sekumpulan barang dan jasa yang dikonsumsi rumahtangga. Angka MtM menunjukkan inflasi bulanan.</p>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Sumber Data</span>
              <p className="text-[var(--app-muted)]">Badan Pusat Statistik (BPS)</p>
              <a href="https://www.bps.go.id/id/pressrelease" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mt-1 inline-block">Verifikasi Sumber ↗</a>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Periode Sumber Data</span>
              <p className="text-[var(--app-muted)]">Data bulanan, dirilis pada awal bulan berikutnya.</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Ekspor/Impor */}
      <CollapsibleSection title="Neraca Perdagangan (Ekspor & Impor)">
        <div className="space-y-2">
          <p className="text-sm text-[var(--app-muted)]">
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
                <p className="text-xs text-[var(--app-subtle)] uppercase font-medium">{d.indicator}</p>
                <p className="text-lg font-semibold text-[var(--app-text)]">
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
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Arti Indikator</span>
              <p className="text-[var(--app-muted)]">Nilai total ekspor dan impor barang Indonesia yang mengukur kinerja perdagangan internasional.</p>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Sumber Data</span>
              <p className="text-[var(--app-muted)]">Badan Pusat Statistik (BPS)</p>
              <a href="https://www.bps.go.id/id/pressrelease" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mt-1 inline-block">Verifikasi Sumber ↗</a>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Periode Sumber Data</span>
              <p className="text-[var(--app-muted)]">Data bulanan, dirilis pada pertengahan bulan berikutnya.</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Wisman */}
      {wismanChartData.length > 0 && (
        <CollapsibleSection title="Kunjungan Wisatawan Mancanegara">
          <div className="space-y-2">
            <p className="text-sm text-[var(--app-muted)]">
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
              <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
                <span className="font-semibold text-[var(--app-text)] block mb-1">Arti Indikator</span>
                <p className="text-[var(--app-muted)]">Jumlah kunjungan warga negara asing ke wilayah Indonesia untuk tujuan wisata atau lainnya dalam periode tertentu.</p>
              </div>
              <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
                <span className="font-semibold text-[var(--app-text)] block mb-1">Sumber Data</span>
                <p className="text-[var(--app-muted)]">Badan Pusat Statistik (BPS)</p>
                <a href="https://www.bps.go.id/subject/16/pariwisata.html" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mt-1 inline-block">Verifikasi Sumber ↗</a>
              </div>
              <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
                <span className="font-semibold text-[var(--app-text)] block mb-1">Periode Sumber Data</span>
                <p className="text-[var(--app-muted)]">Data bulanan, rilis bulan berikutnya.</p>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* PMI */}
      <CollapsibleSection title="PMI Manufaktur">
        <div className="space-y-2">
          <p className="text-sm text-[var(--app-muted)]">
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
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Arti Indikator</span>
              <p className="text-[var(--app-muted)]">Indeks yang mengukur arah tren ekonomi sektor manufaktur. Di atas 50 berarti ekspansi, di bawah 50 berarti kontraksi.</p>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Sumber Data</span>
              <p className="text-[var(--app-muted)]">Bank Indonesia (Survei Kegiatan Dunia Usaha) / S&P Global</p>
              <a href="https://www.bi.go.id" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mt-1 inline-block">Verifikasi Sumber ↗</a>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Periode Sumber Data</span>
              <p className="text-[var(--app-muted)]">Data bulanan, rilis di awal bulan.</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* PHK Timeline */}
      <CollapsibleSection title={`Timeline PHK ${selectedProvince === '00' ? '(Nasional)' : '(Provinsi)'}`} defaultOpen={false}>
        <div className="space-y-2">
          <p className="text-sm text-[var(--app-muted)]">
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
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Arti Indikator</span>
              <p className="text-[var(--app-muted)]">Jumlah tenaga kerja yang terkena PHK berdasarkan kompilasi pemberitaan resmi dan laporan instansi terkait.</p>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Sumber Data</span>
              <p className="text-[var(--app-muted)]">Kementerian Ketenagakerjaan (Kemenaker) & Pemberitaan Media Tersertifikasi</p>
              <a href="https://kemnaker.go.id" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mt-1 inline-block">Verifikasi Sumber ↗</a>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Periode Sumber Data</span>
              <p className="text-[var(--app-muted)]">Data harian/berjalan yang direkap secara otomatis (Tahun 2024 - Sekarang).</p>
            </div>
          </div>
          {/* Detail Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)]">
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--app-subtle)] uppercase">Tanggal</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--app-subtle)] uppercase">Judul</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--app-subtle)] uppercase">Sektor</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-[var(--app-subtle)] uppercase">Pekerja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {filteredPhk.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">Tidak ada data PHK untuk provinsi ini.</td>
                  </tr>
                ) : (
                  filteredPhk.map((d) => (
                    <tr key={d.id} className="hover:bg-[var(--app-bg-soft)]">
                      <td className="py-2.5 px-3 text-[var(--app-muted)] whitespace-nowrap">{formatDate(d.date)}</td>
                      <td className="py-2.5 px-3 text-[var(--app-text)] font-medium">
                        {d._source_url ? (
                          <a href={d._source_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#0D9488] hover:underline">
                            {d.title}
                          </a>
                        ) : (
                          d.title
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500">{d.sector || '-'}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-[var(--app-text)]">
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

