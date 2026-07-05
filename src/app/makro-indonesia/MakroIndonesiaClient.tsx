'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatNumber, formatDate, formatPercent } from '@/lib/utils';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import SparkLine from '@/components/charts/SparkLine';
import { ChevronDown, ChevronUp, ArrowDownAZ, ArrowUpAZ, BarChart3, TrendingUp, X, Table, LayoutGrid, Hash } from 'lucide-react';
import { PROVINCES } from '@/lib/constants';
import EditorialPageShell from '@/components/layout/EditorialPageShell';
import CompactChip from '@/components/ui/CompactChip';
import type { BenchmarkTarget, PHKIntensityPoint } from '@/lib/data-loader-server';

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
    <div className="border border-[var(--app-border)] bg-[var(--app-surface)]">
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
  phkIntensity: PHKIntensityPoint[];
  historicalIhkTradeData: any[];
  wismanData: any[];
  bpsTptHistoricalData: any[];
  benchmarkTargets: BenchmarkTarget[];
}

// Muted band color aligned with the light --app-warning token hex; reads as
// context, not a data series.
const RPJMN_BAND_COLOR = '#8d5a15';

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
  phkIntensity,
  historicalIhkTradeData,
  wismanData,
  bpsTptHistoricalData,
  benchmarkTargets
}: MakroIndonesiaClientProps) {
  const selectedProvince = '00'; // Nasional; the province selector moved out with the Stage 0 PHK cleanup
  const [selectedCoverages, setSelectedCoverages] = useState<string[]>(['00', '31', '32']); // Default: Nasional, DKI Jakarta, Jawa Barat
  const [viewType, setViewType] = useState<'timeline' | 'comparison' | 'grid'>('timeline');
  const [comparisonSort, setComparisonSort] = useState<'desc' | 'asc'>('desc');
  const [gridSort, setGridSort] = useState<'desc' | 'asc' | 'code'>('desc');
  const [ihkView, setIhkView] = useState<'chart' | 'table'>('chart');
  const [tradeView, setTradeView] = useState<'chart' | 'table'>('chart');
  const [wismanView, setWismanView] = useState<'chart' | 'table'>('chart');

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
  const availableObservationYears = useMemo(() => {
    return Array.from(new Set(bpsTimelineData.map((point) => String(point.observation_date).slice(0, 4)))).sort();
  }, [bpsTimelineData]);

  const latestObservationDate = allObservationDates[allObservationDates.length - 1] || '';
  const [selectedPeriod, setSelectedPeriod] = useState<string>(latestObservationDate);
  const [selectedObservationYears, setSelectedObservationYears] = useState<string[]>(availableObservationYears);

  useEffect(() => {
    if (latestObservationDate && !selectedPeriod) {
      setSelectedPeriod(latestObservationDate);
    }
  }, [latestObservationDate, selectedPeriod]);

  const effectiveSelectedObservationYears = useMemo(() => {
    const validYears = selectedObservationYears.filter((year) => availableObservationYears.includes(year));
    if (validYears.length > 0) {
      return validYears;
    }
    return availableObservationYears;
  }, [availableObservationYears, selectedObservationYears]);

  useEffect(() => {
    if (availableObservationYears.length === 0) {
      return;
    }

    const validYears = selectedObservationYears.filter((year) => availableObservationYears.includes(year));
    if (validYears.length === 0) {
      setSelectedObservationYears(availableObservationYears);
    }
  }, [availableObservationYears, selectedObservationYears]);

  const observationDatesForSelectedYear = useMemo(() => {
    return allObservationDates.filter((date) => effectiveSelectedObservationYears.includes(date.slice(0, 4)));
  }, [allObservationDates, effectiveSelectedObservationYears]);

  useEffect(() => {
    if (observationDatesForSelectedYear.length === 0) {
      return;
    }

    if (!observationDatesForSelectedYear.includes(selectedPeriod)) {
      setSelectedPeriod(observationDatesForSelectedYear[observationDatesForSelectedYear.length - 1]);
    }
  }, [observationDatesForSelectedYear, selectedPeriod]);

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
    const visibleObservationDates = new Set(observationDatesForSelectedYear);
    return lineChartData.filter((point) => visibleObservationDates.has(String(point.observationDate)));
  }, [lineChartData, observationDatesForSelectedYear]);

  const comparisonPeriods = useMemo(() => {
    return bpsTimelineData
      .filter((point) => observationDatesForSelectedYear.includes(point.observation_date))
      .map((point) => ({
      id: point.observation_date,
      label: point.observation_label,
    }));
  }, [bpsTimelineData, observationDatesForSelectedYear]);

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

  // Stage 2.1 provincial TPT small-multiples grid. Groups the same
  // provinsiHistoricalData the timeline uses into per-province Sakernas series,
  // so no new data work: latest TPT value + a SparkLine of full history per card.
  // National (00) is pinned first with the --app-teal accent.
  const provinceGridData = useMemo(() => {
    const seriesByCode = new Map<string, { observation_date: string; tpt: number }[]>();
    for (const point of provinsiHistoricalData) {
      if (point.tpt === null || point.tpt === undefined) continue;
      const list = seriesByCode.get(point.province_code) ?? [];
      list.push({ observation_date: point.observation_date, tpt: point.tpt });
      seriesByCode.set(point.province_code, list);
    }

    const codes = ['00', ...PROVINCES.map((province) => province.code)];
    const cards = codes.map((code, index) => {
      const series = (seriesByCode.get(code) ?? [])
        .slice()
        .sort((a, b) => a.observation_date.localeCompare(b.observation_date));
      const latest = series.length > 0 ? series[series.length - 1] : null;
      return {
        code,
        name: code === '00' ? 'Nasional' : (PROVINCES.find((province) => province.code === code)?.name || code),
        sortOrder: code === '00' ? -1 : index,
        latestTpt: latest ? latest.tpt : null,
        latestLabel: latest ? latest.observation_date : null,
        spark: series.map((item) => ({ value: item.tpt })),
        color: code === '00' ? 'var(--app-teal)' : undefined,
      };
    });

    const provinceCards = cards
      .filter((card) => card.code !== '00')
      .sort((left, right) => {
        if (gridSort === 'code') {
          return left.code.localeCompare(right.code);
        }
        const leftValue = left.latestTpt;
        const rightValue = right.latestTpt;
        // Cards without a latest value sort to the end regardless of direction.
        if (leftValue === null && rightValue === null) return left.sortOrder - right.sortOrder;
        if (leftValue === null) return 1;
        if (rightValue === null) return -1;
        return gridSort === 'desc' ? rightValue - leftValue : leftValue - rightValue;
      });

    // National always pinned first, whatever the sort.
    const national = cards.find((card) => card.code === '00');
    return national ? [national, ...provinceCards] : provinceCards;
  }, [provinsiHistoricalData, gridSort]);

  const latestGridObservationLabel = useMemo(() => {
    const national = provinceGridData.find((card) => card.code === '00');
    return national?.latestLabel ?? '';
  }, [provinceGridData]);

  const activeChartLines = chartLines;
  const selectedPeriodLabel = timelinePointMeta.get(selectedPeriod)?.observationLabel || selectedPeriod;

  // Stage 1 benchmark layer: RPJMN national TPT target band on the timeline.
  // Presentation-layer only (ReferenceArea); never mixed into the observed series.
  const rpjmnTptTarget = useMemo(
    () =>
      benchmarkTargets.find(
        (target) => target.indicator === 'tpt' && target.scope === 'national'
      ) ?? null,
    [benchmarkTargets]
  );
  const tptReferenceAreas = useMemo(() => {
    if (!rpjmnTptTarget) return undefined;
    return [
      {
        y1: rpjmnTptTarget.valueMin,
        y2: rpjmnTptTarget.valueMax,
        label: `${rpjmnTptTarget.label} (${formatNumber(rpjmnTptTarget.valueMin, 2)}-${formatNumber(rpjmnTptTarget.valueMax, 2)}%)`,
        color: RPJMN_BAND_COLOR,
      },
    ];
  }, [rpjmnTptTarget]);

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

  const handleSelectAllObservationYears = () => {
    setSelectedObservationYears(availableObservationYears);
  };

  const handleSelectRecentObservationYears = () => {
    setSelectedObservationYears(availableObservationYears.slice(-12));
  };

  const toggleObservationYear = (year: string) => {
    if (effectiveSelectedObservationYears.includes(year)) {
      if (effectiveSelectedObservationYears.length > 1) {
        setSelectedObservationYears(effectiveSelectedObservationYears.filter((item) => item !== year));
      }
      return;
    }

    setSelectedObservationYears([...effectiveSelectedObservationYears, year]);
  };

  // Real Kemenaker PHK articles, newest first. Stage 0 keeps this as an honest
  // article list (no province_code / workers_affected exist in the real data);
  // the richer PHK tracker lands in Stage 2.
  const phkArticles = phkData
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Stage 2.3 honest PHK tracker: monthly reporting-intensity bars (article &
  // release COUNTS, never workers affected, never regex-extracted numbers).
  const phkIntensityRows = useMemo(
    () =>
      phkIntensity.map((point) => ({
        period: point.monthLabel,
        'Rilis Kemenaker': point.kemenaker,
        'Pemberitaan (arsip)': point.berita,
      })),
    [phkIntensity]
  );
  const phkIntensityTotal = useMemo(
    () => phkIntensity.reduce((sum, point) => sum + point.total, 0),
    [phkIntensity]
  );
  const phkIntensityRange = phkIntensity.length > 0
    ? `${phkIntensity[0].monthLabel} - ${phkIntensity[phkIntensity.length - 1].monthLabel}`
    : '';

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

  const ihkPeriods = ihkData.map((row) => String(row.period));
  const tradeChartPeriods = tradeData.map((row) => String(row.period));
  const wismanPeriods = wismanChartData.map((row) => String(row.period));
  const pmiPeriods = pmiChartData.map((row) => String(row.period));

  const [selectedIhkPeriods, setSelectedIhkPeriods] = useState<string[]>(ihkPeriods);
  const [selectedTradePeriods, setSelectedTradePeriods] = useState<string[]>(tradeChartPeriods);
  const [selectedWismanPeriods, setSelectedWismanPeriods] = useState<string[]>(wismanPeriods);
  const [selectedPmiPeriods, setSelectedPmiPeriods] = useState<string[]>(pmiPeriods);

  const effectiveIhkPeriods = selectedIhkPeriods.filter((period) => ihkPeriods.includes(period));
  const effectiveTradePeriods = selectedTradePeriods.filter((period) => tradeChartPeriods.includes(period));
  const effectiveWismanPeriods = selectedWismanPeriods.filter((period) => wismanPeriods.includes(period));
  const effectivePmiPeriods = selectedPmiPeriods.filter((period) => pmiPeriods.includes(period));

  useEffect(() => {
    if (ihkPeriods.length > 0 && effectiveIhkPeriods.length === 0) {
      setSelectedIhkPeriods(ihkPeriods);
    }
  }, [effectiveIhkPeriods.length, ihkPeriods]);

  useEffect(() => {
    if (tradeChartPeriods.length > 0 && effectiveTradePeriods.length === 0) {
      setSelectedTradePeriods(tradeChartPeriods);
    }
  }, [effectiveTradePeriods.length, tradeChartPeriods]);

  useEffect(() => {
    if (wismanPeriods.length > 0 && effectiveWismanPeriods.length === 0) {
      setSelectedWismanPeriods(wismanPeriods);
    }
  }, [effectiveWismanPeriods.length, wismanPeriods]);

  useEffect(() => {
    if (pmiPeriods.length > 0 && effectivePmiPeriods.length === 0) {
      setSelectedPmiPeriods(pmiPeriods);
    }
  }, [effectivePmiPeriods.length, pmiPeriods]);

  const activeIhkPeriods = effectiveIhkPeriods.length > 0 ? effectiveIhkPeriods : ihkPeriods;
  const activeTradePeriods = effectiveTradePeriods.length > 0 ? effectiveTradePeriods : tradeChartPeriods;
  const activeWismanPeriods = effectiveWismanPeriods.length > 0 ? effectiveWismanPeriods : wismanPeriods;
  const activePmiPeriods = effectivePmiPeriods.length > 0 ? effectivePmiPeriods : pmiPeriods;

  const filteredIhkData = ihkData.filter((row) => activeIhkPeriods.includes(String(row.period)));
  const filteredTradeData = tradeData.filter((row) => activeTradePeriods.includes(String(row.period)));
  const filteredWismanChartData = wismanChartData.filter((row) => activeWismanPeriods.includes(String(row.period)));
  const filteredPmiChartData = pmiChartData.filter((row) => activePmiPeriods.includes(String(row.period)));

  const togglePeriod = (period: string, activePeriods: string[], setPeriods: (periods: string[]) => void) => {
    if (activePeriods.includes(period)) {
      if (activePeriods.length > 1) {
        setPeriods(activePeriods.filter((item) => item !== period));
      }
      return;
    }

    setPeriods([...activePeriods, period]);
  };

  const showWarning = bpsSource === 'static_seed' || provinsiSource === 'fallback_spreadsheet';
  const fallbackMessages = [
    bpsSource === 'static_seed'
      ? 'Indikator nasional seperti IHK, ekspor, dan impor sedang memakai cadangan statis lokal karena API BPS belum terjangkau.'
      : null,
    provinsiSource === 'fallback_spreadsheet'
      ? 'TPT tingkat provinsi sedang memakai spreadsheet cadangan karena API BPS belum terjangkau.'
      : null,
  ].filter(Boolean) as string[];

  return (
    <EditorialPageShell>
      {/* Fallback Warnings */}
      {false && showWarning && (
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
      {showWarning && (
        <div className="mb-4 rounded-md border border-[var(--app-warning)] bg-[color:color-mix(in_srgb,var(--app-warning)_10%,var(--app-surface))] p-4 text-sm text-[var(--app-text)] shadow-2xs">
          <div className="flex items-start space-x-2">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--app-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="space-y-2">
              <span className="block font-semibold">Pemberitahuan sumber data cadangan</span>
              <ul className="space-y-1 text-xs leading-relaxed text-[var(--app-muted)]">
                {fallbackMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      {/* Interactive TPT Dashboard Section */}
      <CollapsibleSection title="Analisis Tingkat Pengangguran Terbuka (TPT) Sakernas" defaultOpen={true}>
        <div className="space-y-4">
          <div className="space-y-4 border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-3">
            <div className="flex max-w-md space-x-1 rounded-md bg-[var(--app-border)]/30 p-1">
              <button
                onClick={() => setViewType('timeline')}
                className={`flex flex-1 cursor-pointer items-center justify-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${viewType === 'timeline' ? 'bg-[var(--app-surface)] text-[var(--app-teal)] shadow-xs' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Tren Sakernas</span>
              </button>
              <button
                onClick={() => setViewType('comparison')}
                className={`flex flex-1 cursor-pointer items-center justify-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${viewType === 'comparison' ? 'bg-[var(--app-surface)] text-[var(--app-teal)] shadow-xs' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Perbandingan</span>
              </button>
              <button
                onClick={() => setViewType('grid')}
                className={`flex flex-1 cursor-pointer items-center justify-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${viewType === 'grid' ? 'bg-[var(--app-surface)] text-[var(--app-teal)] shadow-xs' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Grid Provinsi</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
                  Tahun
                </span>
                <CompactChip onClick={handleSelectAllObservationYears}>
                  Semua tahun
                </CompactChip>
                <CompactChip onClick={handleSelectRecentObservationYears}>
                  12 tahun terbaru
                </CompactChip>
              </div>

              {viewType === 'timeline' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedCoverages.map((code, idx) => {
                      const isNational = code === '00';
                      const name = isNational ? 'Nasional' : (PROVINCES.find((province) => province.code === code)?.name || code);
                      const color = LINE_COLORS[idx % LINE_COLORS.length];
                      return (
                        <div
                          key={code}
                          className="flex items-center space-x-1 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] shadow-xs"
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
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddCoverage(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full max-w-sm border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-sm text-[var(--app-text)] focus:border-[var(--app-link)] focus:outline-none"
                  >
                    <option value="" disabled>Tambah wilayah...</option>
                    <option value="00">Nasional</option>
                    {PROVINCES.filter((province) => !selectedCoverages.includes(province.code)).map((province) => (
                      <option key={province.code} value={province.code}>{province.name}</option>
                    ))}
                  </select>
                </div>
              ) : viewType === 'comparison' ? (
                <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="w-full border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-sm text-[var(--app-text)] focus:border-[var(--app-link)] focus:outline-none"
                    >
                      {comparisonPeriods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex space-x-1 rounded-md bg-[var(--app-border)]/30 p-1">
                    <button
                      onClick={() => setComparisonSort('desc')}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${comparisonSort === 'desc' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                    >
                      <ArrowDownAZ className="h-3.5 w-3.5" />
                      <span>TPT tertinggi</span>
                    </button>
                    <button
                      onClick={() => setComparisonSort('asc')}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${comparisonSort === 'asc' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                    >
                      <ArrowUpAZ className="h-3.5 w-3.5" />
                      <span>TPT terendah</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex max-w-md space-x-1 rounded-md bg-[var(--app-border)]/30 p-1">
                    <button
                      onClick={() => setGridSort('desc')}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${gridSort === 'desc' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                    >
                      <ArrowDownAZ className="h-3.5 w-3.5" />
                      <span>TPT tertinggi</span>
                    </button>
                    <button
                      onClick={() => setGridSort('asc')}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${gridSort === 'asc' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                    >
                      <ArrowUpAZ className="h-3.5 w-3.5" />
                      <span>TPT terendah</span>
                    </button>
                    <button
                      onClick={() => setGridSort('code')}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${gridSort === 'code' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                    >
                      <Hash className="h-3.5 w-3.5" />
                      <span>Kode BPS</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--app-muted)]">
                    Klik kartu provinsi untuk menambah atau menghapusnya dari grafik tren di atas.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div id="tpt-chart-container" className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-2xs">
            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
              {viewType === 'timeline'
                ? 'Tren Perkembangan TPT BPS Sakernas (1986-2026) (%)'
                : viewType === 'comparison'
                ? `Perbandingan Wilayah TPT BPS Sakernas - ${selectedPeriodLabel} (%)`
                : 'Grid Provinsi TPT BPS Sakernas (nilai terkini + tren historis)'}
            </h4>
            {viewType === 'timeline' ? (
              <LineChart
                data={activeLineChartData}
                xKey="x"
                lines={activeChartLines}
                height={350}
                yDomain={[0, 12]}
                referenceAreas={tptReferenceAreas}
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
            {viewType === 'grid' && (
              provinceGridData.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--app-muted)]">
                  Data historis TPT provinsi belum tersedia dari BPS Sakernas.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-px border border-[var(--app-border)] bg-[var(--app-border)] sm:grid-cols-4 xl:grid-cols-6">
                  {provinceGridData.map((card) => {
                    const isNational = card.code === '00';
                    const isSelected = selectedCoverages.includes(card.code);
                    return (
                      <button
                        key={card.code}
                        type="button"
                        aria-pressed={isSelected}
                        title={`${card.name} - klik untuk memilih di grafik tren`}
                        onClick={() =>
                          isSelected ? handleRemoveCoverage(card.code) : handleAddCoverage(card.code)
                        }
                        className={`flex cursor-pointer flex-col gap-1.5 bg-[var(--app-surface)] p-2.5 text-left transition-colors hover:bg-[var(--app-bg-soft)] focus-visible:app-focus ${
                          isSelected ? 'bg-[var(--app-bg-soft)]' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span
                            className="text-[11px] font-semibold uppercase leading-tight tracking-[0.04em] text-[var(--app-text)]"
                            style={isNational ? { color: 'var(--app-teal)' } : undefined}
                          >
                            {card.name}
                          </span>
                          {isSelected && (
                            <span
                              aria-hidden="true"
                              className="mt-0.5 h-2 w-2 shrink-0 bg-[var(--app-teal)]"
                            />
                          )}
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <span className="text-lg font-extrabold tabular-nums text-[var(--app-text)]">
                            {card.latestTpt !== null ? `${formatNumber(card.latestTpt, 2)}%` : '-'}
                          </span>
                          {card.spark.length > 1 && (
                            <SparkLine
                              data={card.spark}
                              width={64}
                              height={24}
                              color={isNational ? '#507b6a' : '#a33d2d'}
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--app-subtle)]">
                          {card.code === '00' ? 'Kode 00' : `Kode ${card.code}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            )}
            {viewType === 'grid' ? (
              latestGridObservationLabel && (
                <p className="mt-3 text-[11px] text-[var(--app-muted)]">
                  Nilai terkini per kartu memakai observasi Sakernas terbaru ({latestGridObservationLabel}); garis kecil menampilkan seluruh riwayat TPT sejak 1986. Sumber: BPS Web API (var 543).
                </p>
              )
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
                  Tahun
                </span>
                {availableObservationYears.map((year) => (
                  <CompactChip
                    key={year}
                    active={effectiveSelectedObservationYears.includes(year)}
                    onClick={() => toggleObservationYear(year)}
                  >
                    {year}
                  </CompactChip>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-4 border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-4 text-xs text-[var(--app-muted)] md:grid-cols-2">
            <div>
              <span className="mb-1 block font-bold text-[var(--app-text)]">Catatan Ketersediaan Data BPS Resmi:</span>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Seluruh grafik TPT di panel ini memakai seri resmi BPS Sakernas sejak 1986 tanpa seri Bank Dunia.</li>
                <li>Titik waktu mengikuti tanggal observasi asli BPS: 1986-2004 ditampilkan sebagai observasi tahunan, sedangkan 2005-2026 memakai bulan rilis resmi seperti Februari dan Agustus.</li>
                <li>Data provinsi kini mengikuti observasi historis yang sama dengan grafik nasional. Provinsi baru akan mulai muncul sejak observasi resmi pertama yang tersedia di BPS.</li>
                <li>Tahun 1995 tidak memiliki titik karena Sakernas tidak dilaksanakan pada tahun tersebut.</li>
                {rpjmnTptTarget && (
                  <li>
                    Patokan: band {rpjmnTptTarget.label} ({formatNumber(rpjmnTptTarget.valueMin, 2)}-{formatNumber(rpjmnTptTarget.valueMax, 2)}% pada {rpjmnTptTarget.period}) ditampilkan sebagai konteks reference-only, bukan seri observasi.{' '}
                    <a href={rpjmnTptTarget.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--app-link)] underline">
                      {rpjmnTptTarget.sourceName} (verifikasi sumber)
                    </a>.
                  </li>
                )}
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

      {/* IHK */}
      <CollapsibleSection title="Indeks Harga Konsumen (IHK)">
        <div className="space-y-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-[var(--app-muted)]">
              Tren IHK dan inflasi bulanan (month-to-month) berdasarkan data BPS.
            </p>
            <div className="flex w-full max-w-xs space-x-1 bg-[var(--app-border)]/30 p-1">
              <button onClick={() => setIhkView('chart')} className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold ${ihkView === 'chart' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)]'}`}><TrendingUp className="h-3.5 w-3.5" />Grafik</button>
              <button onClick={() => setIhkView('table')} className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold ${ihkView === 'table' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)]'}`}><Table className="h-3.5 w-3.5" />Tabel</button>
            </div>
          </div>
          {ihkView === 'chart' ? (
            <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-2xs">
              <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
                Tren IHK dan Inflasi Bulanan BPS
              </h4>
              <LineChart
                data={filteredIhkData}
                xKey="period"
                lines={[
                  { dataKey: 'IHK', label: 'IHK', color: '#0D9488' },
                  { dataKey: 'Inflasi MtM (%)', label: 'Inflasi MtM (%)', color: '#F59E0B', strokeDasharray: '5 5' },
                ]}
                height={360}
              />
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
                  Periode
                </span>
                {ihkPeriods.map((period) => (
                  <CompactChip
                    key={period}
                    active={activeIhkPeriods.includes(period)}
                    onClick={() => togglePeriod(period, activeIhkPeriods, setSelectedIhkPeriods)}
                  >
                    {period}
                  </CompactChip>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-2xs">
              <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
                Tabel IHK dan Inflasi Bulanan BPS
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="border-b border-[var(--app-border)] text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]"><th className="px-3 py-2 text-left">Periode</th><th className="px-3 py-2 text-right">IHK</th><th className="px-3 py-2 text-right">Inflasi MtM</th></tr></thead>
                  <tbody className="divide-y divide-[var(--app-border)]">{filteredIhkData.map((row) => (<tr key={row.period}><td className="px-3 py-2">{row.period}</td><td className="px-3 py-2 text-right">{formatNumber(Number(row.IHK || 0), 2)}</td><td className="px-3 py-2 text-right">{formatPercent(Number(row['Inflasi MtM (%)'] || 0), 2)}</td></tr>))}</tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
                  Periode
                </span>
                {ihkPeriods.map((period) => (
                  <CompactChip
                    key={period}
                    active={activeIhkPeriods.includes(period)}
                    onClick={() => togglePeriod(period, activeIhkPeriods, setSelectedIhkPeriods)}
                  >
                    {period}
                  </CompactChip>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Arti Indikator</span>
              <p className="text-[var(--app-muted)]">Mengukur rata-rata perubahan harga sekumpulan barang dan jasa yang dikonsumsi rumahtangga. Angka MtM menunjukkan inflasi bulanan.</p>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Sumber Data</span>
              <p className="text-[var(--app-muted)]">Badan Pusat Statistik (BPS)</p>
              <a href="https://www.bps.go.id/id/pressrelease" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[var(--app-link)] hover:underline">Verifikasi Sumber ↗</a>
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-[var(--app-muted)]">
              Perbandingan nilai ekspor dan impor dalam miliar USD.
            </p>
            <div className="flex w-full max-w-xs space-x-1 bg-[var(--app-border)]/30 p-1">
              <button onClick={() => setTradeView('chart')} className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold ${tradeView === 'chart' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)]'}`}><BarChart3 className="h-3.5 w-3.5" />Grafik</button>
              <button onClick={() => setTradeView('table')} className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold ${tradeView === 'table' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)]'}`}><Table className="h-3.5 w-3.5" />Tabel</button>
            </div>
          </div>
          {tradeView === 'chart' ? (
            <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-2xs">
              <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
                Neraca Perdagangan Bulanan BPS
              </h4>
              <BarChart
                data={filteredTradeData}
                xKey="period"
                bars={[
                  { dataKey: 'Ekspor', label: 'Ekspor (USD M)', color: '#0D9488' },
                  { dataKey: 'Impor', label: 'Impor (USD M)', color: '#F59E0B' },
                ]}
                showLegend
                height={340}
                barSize={36}
              />
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
                  Periode
                </span>
                {tradeChartPeriods.map((period) => (
                  <CompactChip
                    key={period}
                    active={activeTradePeriods.includes(period)}
                    onClick={() => togglePeriod(period, activeTradePeriods, setSelectedTradePeriods)}
                  >
                    {period}
                  </CompactChip>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-2xs">
              <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
                Tabel Neraca Perdagangan Bulanan BPS
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="border-b border-[var(--app-border)] text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]"><th className="px-3 py-2 text-left">Periode</th><th className="px-3 py-2 text-right">Ekspor</th><th className="px-3 py-2 text-right">Impor</th></tr></thead>
                  <tbody className="divide-y divide-[var(--app-border)]">{filteredTradeData.map((row) => (<tr key={row.period}><td className="px-3 py-2">{row.period}</td><td className="px-3 py-2 text-right">US${formatNumber(Number(row.Ekspor || 0), 2)} M</td><td className="px-3 py-2 text-right">US${formatNumber(Number(row.Impor || 0), 2)} M</td></tr>))}</tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
                  Periode
                </span>
                {tradeChartPeriods.map((period) => (
                  <CompactChip
                    key={period}
                    active={activeTradePeriods.includes(period)}
                    onClick={() => togglePeriod(period, activeTradePeriods, setSelectedTradePeriods)}
                  >
                    {period}
                  </CompactChip>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {eksporData.map((d) => (
              <div key={d.id} className="border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-3">
                <p className="text-xs text-[var(--app-subtle)] uppercase font-medium">{d.indicator}</p>
                <p className="text-lg font-semibold text-[var(--app-text)]">
                  US${formatNumber((d.value || 0) / 1e9, 2)} M
                </p>
                <p className="text-xs text-[var(--app-subtle)]">Rilis: {d.period}</p>
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
              <a href="https://www.bps.go.id/id/pressrelease" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[var(--app-link)] hover:underline">Verifikasi Sumber ↗</a>
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
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-[var(--app-muted)]">
                Tren jumlah kunjungan wisatawan mancanegara ke Indonesia.
              </p>
              <div className="flex w-full max-w-xs space-x-1 bg-[var(--app-border)]/30 p-1">
                <button onClick={() => setWismanView('chart')} className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold ${wismanView === 'chart' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)]'}`}><TrendingUp className="h-3.5 w-3.5" />Grafik</button>
                <button onClick={() => setWismanView('table')} className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold ${wismanView === 'table' ? 'bg-[var(--app-surface)] text-[var(--app-teal)]' : 'text-[var(--app-muted)]'}`}><Table className="h-3.5 w-3.5" />Tabel</button>
              </div>
            </div>
            {wismanView === 'chart' ? (
              <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-2xs">
                <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
                  Kunjungan Wisatawan Mancanegara Bulanan BPS
                </h4>
                <LineChart
                  data={filteredWismanChartData}
                  xKey="period"
                  lines={[
                    { dataKey: 'Kunjungan', label: 'Kunjungan Wisman', color: '#8B5CF6' },
                  ]}
                  height={360}
                />
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
                    Periode
                  </span>
                  {wismanPeriods.map((period) => (
                    <CompactChip
                      key={period}
                      active={activeWismanPeriods.includes(period)}
                      onClick={() => togglePeriod(period, activeWismanPeriods, setSelectedWismanPeriods)}
                    >
                      {period}
                    </CompactChip>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-2xs">
                <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
                  Tabel Kunjungan Wisatawan Mancanegara BPS
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead><tr className="border-b border-[var(--app-border)] text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]"><th className="px-3 py-2 text-left">Periode</th><th className="px-3 py-2 text-right">Kunjungan</th><th className="px-3 py-2 text-right">YoY</th></tr></thead>
                    <tbody className="divide-y divide-[var(--app-border)]">{filteredWismanChartData.map((row) => (<tr key={row.period}><td className="px-3 py-2">{row.period}</td><td className="px-3 py-2 text-right">{formatNumber(Number(row.Kunjungan || 0))}</td><td className="px-3 py-2 text-right">{formatPercent(Number(row['YoY (%)'] || 0), 2)}</td></tr>))}</tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
                    Periode
                  </span>
                  {wismanPeriods.map((period) => (
                    <CompactChip
                      key={period}
                      active={activeWismanPeriods.includes(period)}
                      onClick={() => togglePeriod(period, activeWismanPeriods, setSelectedWismanPeriods)}
                    >
                      {period}
                    </CompactChip>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
                <span className="font-semibold text-[var(--app-text)] block mb-1">Arti Indikator</span>
                <p className="text-[var(--app-muted)]">Jumlah kunjungan warga negara asing ke wilayah Indonesia untuk tujuan wisata atau lainnya dalam periode tertentu.</p>
              </div>
              <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
                <span className="font-semibold text-[var(--app-text)] block mb-1">Sumber Data</span>
                <p className="text-[var(--app-muted)]">Badan Pusat Statistik (BPS)</p>
                <a href="https://www.bps.go.id/subject/16/pariwisata.html" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[var(--app-link)] hover:underline">Verifikasi Sumber ↗</a>
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
          {pmiData.length === 0 ? (
            <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-sm text-[var(--app-muted)]">
              Data PMI belum tersedia dari Bank Indonesia.
            </div>
          ) : (
          <>
          <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-2xs">
            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
              PMI Manufaktur dan Subindeks Utama
            </h4>
            <LineChart
              data={filteredPmiChartData}
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
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">
                Periode
              </span>
              {pmiPeriods.map((period) => (
                <CompactChip
                  key={period}
                  active={activePmiPeriods.includes(period)}
                  onClick={() => togglePeriod(period, activePmiPeriods, setSelectedPmiPeriods)}
                >
                  {period}
                </CompactChip>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Arti Indikator</span>
              <p className="text-[var(--app-muted)]">Indeks yang mengukur arah tren ekonomi sektor manufaktur. Di atas 50 berarti ekspansi, di bawah 50 berarti kontraksi.</p>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Sumber Data</span>
              <p className="text-[var(--app-muted)]">Bank Indonesia (Survei Kegiatan Dunia Usaha) / S&P Global</p>
              <a href="https://www.bi.go.id" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[var(--app-link)] hover:underline">Verifikasi Sumber ↗</a>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Periode Sumber Data</span>
              <p className="text-[var(--app-muted)]">Data bulanan, rilis di awal bulan.</p>
            </div>
          </div>
          </>
          )}
        </div>
      </CollapsibleSection>

      {/* PHK Kemenaker */}
      <CollapsibleSection title="Intensitas Pemberitaan & Rilis Resmi PHK" defaultOpen={false}>
        <div className="space-y-2">
          <p className="text-sm text-[var(--app-muted)]">
            Frekuensi bulanan rilis resmi Kemenaker dan pemberitaan arsip terkait pemutusan hubungan kerja. Angka ini mengukur intensitas pemberitaan, bukan jumlah pekerja yang terkena PHK.
          </p>
          <div className="border border-[var(--app-danger)]/40 bg-[var(--app-bg-soft)] p-3 text-xs text-[var(--app-muted)]">
            <span className="font-bold text-[var(--app-text)]">Catatan penting:</span> grafik ini menghitung jumlah artikel dan rilis per bulan sebagai proksi sinyal. Ini bukan angka pekerja terdampak PHK; tidak ada angka yang diekstraksi dari judul berita.
          </div>
          {phkIntensityRows.length > 0 ? (
            <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-2xs">
              <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
                Intensitas Pemberitaan & Rilis Resmi PHK per Bulan (jumlah artikel)
              </h4>
              <BarChart
                data={phkIntensityRows}
                xKey="period"
                bars={[
                  { dataKey: 'Rilis Kemenaker', label: 'Rilis Kemenaker', color: '#EF4444' },
                  { dataKey: 'Pemberitaan (arsip)', label: 'Pemberitaan (arsip)', color: '#F59E0B' },
                ]}
                height={320}
                showLegend={true}
                xTickAngle={-45}
                xTickInterval={0}
                xTickHeight={64}
                xTickFontSize={10}
                valueFormatter={(val) => `${formatNumber(Number(val))} artikel`}
              />
              <p className="mt-2 text-center text-[11px] text-[var(--app-muted)]">
                Total {formatNumber(phkIntensityTotal)} artikel/rilis{phkIntensityRange ? ` (${phkIntensityRange})` : ''}. Sumber: rilis Kemenaker + arsip berita ketenagakerjaan dengan kata kunci PHK.
              </p>
            </div>
          ) : (
            <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-center text-sm text-[var(--app-muted)]">
              Data intensitas PHK belum tersedia.
            </div>
          )}
          <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-2xs">
            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
              Daftar Rilis PHK
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--app-border)]">
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--app-subtle)] uppercase">Tanggal</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--app-subtle)] uppercase">Judul</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--app-border)]">
                  {phkArticles.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-[var(--app-muted)]">Data PHK belum tersedia dari Kementerian Ketenagakerjaan.</td>
                    </tr>
                  ) : (
                    phkArticles.map((d) => (
                      <tr key={d._source_url || d.title} className="hover:bg-[var(--app-bg-soft)]">
                        <td className="py-2.5 px-3 text-[var(--app-muted)] whitespace-nowrap">{formatDate(d.date)}</td>
                        <td className="py-2.5 px-3 text-[var(--app-text)] font-medium">
                          {d._source_url ? (
                            <a href={d._source_url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--app-link)] hover:underline">
                              {d.title}
                            </a>
                          ) : (
                            d.title
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 mb-4">
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Arti Indikator</span>
              <p className="text-[var(--app-muted)]">Rilis resmi dan pemberitaan Kemenaker terkait pemutusan hubungan kerja serta perlindungan pekerja.</p>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Sumber Data</span>
              <p className="text-[var(--app-muted)]">Kementerian Ketenagakerjaan (Kemnaker)</p>
              <a href="https://kemnaker.go.id" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[var(--app-link)] hover:underline">Verifikasi Sumber \u2197</a>
            </div>
            <div className="bg-[var(--app-bg-soft)] p-3 rounded-md text-xs">
              <span className="font-semibold text-[var(--app-text)] block mb-1">Periode Sumber Data</span>
              <p className="text-[var(--app-muted)]">Direkap otomatis dari laman berita Kemnaker.</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </EditorialPageShell>
  );
}

