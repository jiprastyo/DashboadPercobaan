'use client';

import { useMemo, useState } from 'react';
import type {
  ASEANComparableData,
  ASEANHistoricalData,
  ASEANIndicatorMetadata,
} from '@/lib/data-loader-server';
import { formatPercent, formatNumber } from '@/lib/utils';
import { ASEAN_COUNTRIES } from '@/lib/constants';
import LineChart from '@/components/charts/LineChart';
import { TrendingUp, Table, Check, Layers3, Info } from 'lucide-react';

interface MakroASEANClientProps {
  comparableData: ASEANComparableData | null;
}

type TopicTable = {
  id: string;
  title: string;
  description: string;
  yearsTable: string[];
  tableRows: Array<{
    countryCode: string;
    countryName: string;
    flagEmoji: string;
    primaryValues: Record<string, number | null>;
    overlayValues: Record<string, number | null>;
  }>;
  chartData: Array<Record<string, string | number | null>>;
  chartLines: Array<{
    dataKey: string;
    label: string;
    color: string;
    strokeDasharray?: string;
  }>;
  metadata?: ASEANIndicatorMetadata;
};

const LINE_COLORS = ['#0D9488', '#3B82F6', '#F97316', '#16A34A', '#DC2626', '#7C3AED', '#0891B2', '#A16207', '#475569', '#EC4899', '#14B8A6'];

function getAvailableYears(primaryData: ASEANHistoricalData | null, overlayData: ASEANHistoricalData | null): string[] {
  const allYears = new Set<string>();

  [primaryData, overlayData].forEach((dataset) => {
    dataset?.countries.forEach((country) => {
      Object.values(country.indicators).forEach((indicator) => {
        indicator.values.forEach((value) => {
          if (value.year) {
            allYears.add(value.year);
          }
        });
      });
    });
  });

  return Array.from(allYears).sort((a, b) => b.localeCompare(a));
}

function getInitialSelectedYears(primaryData: ASEANHistoricalData | null, overlayData: ASEANHistoricalData | null): string[] {
  const availableYears = getAvailableYears(primaryData, overlayData);
  if (availableYears.length === 0) {
    return ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
  }

  return [...availableYears].slice(0, 8).sort((a, b) => a.localeCompare(b));
}

function findCountryData(dataset: ASEANHistoricalData | null, countryCode: string) {
  if (!dataset) return null;

  const countryInfo = ASEAN_COUNTRIES.find((item) => item.country_code === countryCode);
  if (!countryInfo) return null;

  return dataset.countries.find(
    (item) =>
      item.countryName === countryInfo.country_name_en ||
      item.countryName === countryInfo.country_name_id ||
      item.countryCode === countryCode.replace('IDN', 'ID')
  );
}

function MetadataPanel({ metadata }: { metadata?: ASEANIndicatorMetadata }) {
  if (!metadata) return null;

  return (
    <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--app-subtle)]">
        <Info className="h-3.5 w-3.5" />
        <span>Metadata Sumber</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
          <p className="text-xs font-semibold text-[var(--app-text)]">{metadata.primaryLabel}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{metadata.primaryDescription}</p>
          <a
            href={metadata.primarySourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-[var(--app-link)] hover:underline focus-visible:app-focus"
          >
            Buka rujukan default
          </a>
        </div>
        <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
          <p className="text-xs font-semibold text-[var(--app-text)]">{metadata.overlayLabel}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{metadata.overlayDescription}</p>
          <a
            href={metadata.overlaySourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-[var(--app-link)] hover:underline focus-visible:app-focus"
          >
            Buka metadata World Bank
          </a>
        </div>
      </div>
    </div>
  );
}

export default function MakroASEANClient({ comparableData }: MakroASEANClientProps) {
  const primaryData = comparableData?.primary ?? null;
  const overlayData = comparableData?.worldBank ?? null;
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['IDN', 'MYS', 'SGP', 'THA']);
  const [selectedYears, setSelectedYears] = useState<string[]>(() => getInitialSelectedYears(primaryData, overlayData));
  const [activeTabs, setActiveTabs] = useState<Record<string, 'chart' | 'table'>>({});
  const [showWorldBankOverlay, setShowWorldBankOverlay] = useState(false);

  const availableYears = useMemo(
    () => getAvailableYears(primaryData, overlayData),
    [overlayData, primaryData]
  );

  const effectiveSelectedYears = useMemo(() => {
    const validCurrentYears = selectedYears.filter((year) => availableYears.includes(year));
    if (validCurrentYears.length > 0) {
      return validCurrentYears;
    }
    return getInitialSelectedYears(primaryData, overlayData);
  }, [availableYears, overlayData, primaryData, selectedYears]);

  const toggleCountry = (code: string) => {
    if (selectedCountries.includes(code)) {
      if (selectedCountries.length > 1) {
        setSelectedCountries(selectedCountries.filter((countryCode) => countryCode !== code));
      }
    } else {
      setSelectedCountries([...selectedCountries, code]);
    }
  };

  const toggleYear = (year: string) => {
    if (effectiveSelectedYears.includes(year)) {
      if (effectiveSelectedYears.length > 1) {
        setSelectedYears(effectiveSelectedYears.filter((item) => item !== year));
      }
    } else {
      setSelectedYears([...effectiveSelectedYears, year]);
    }
  };

  const topicTables = useMemo<TopicTable[]>(() => {
    if (!primaryData) return [];

    const sortedYearsAsc = [...effectiveSelectedYears].sort((a, b) => a.localeCompare(b));
    const sortedYearsDesc = [...effectiveSelectedYears].sort((a, b) => b.localeCompare(a));

    const topicsDef = [
      {
        id: 'SL.UEM.TOTL.ZS',
        title: 'Tingkat Pengangguran Terbuka (%)',
        description: 'Default menempatkan Indonesia pada seri resmi BPS. Overlay World Bank dapat diaktifkan untuk membandingkan modeled ILO estimate pada panel yang sama.',
      },
      {
        id: 'SL.TLF.CACT.ZS',
        title: 'Tingkat Partisipasi Angkatan Kerja (TPAK) (%)',
        description: 'TPAK Indonesia mengikuti seri resmi BPS, lalu pembanding kawasan memakai panel historis yang tersimpan di repo dengan opsi overlay World Bank nonaktif secara bawaan.',
      },
      {
        id: 'SL.EMP.TOTL.SP.ZS',
        title: 'Rasio Pekerja terhadap Populasi (%)',
        description: 'Untuk Indonesia, rasio ini diturunkan dari seri resmi BPS. World Bank tetap tersedia sebagai lapisan pembanding terpisah di grafik dan tabel.',
      },
    ];

    return topicsDef.map((topic) => {
      const metadata = comparableData?.metadata.find((item) => item.indicatorId === topic.id);

      const tableRows = selectedCountries.map((code) => {
        const countryInfo = ASEAN_COUNTRIES.find((item) => item.country_code === code);
        const primaryCountry = findCountryData(primaryData, code);
        const overlayCountry = findCountryData(overlayData, code);

        const primaryValues: Record<string, number | null> = {};
        const overlayValues: Record<string, number | null> = {};

        effectiveSelectedYears.forEach((year) => {
          const primaryValue = primaryCountry?.indicators[topic.id]?.values.find((value) => value.year === year);
          const overlayValue = overlayCountry?.indicators[topic.id]?.values.find((value) => value.year === year);
          primaryValues[year] = primaryValue ? primaryValue.value : null;
          overlayValues[year] = overlayValue ? overlayValue.value : null;
        });

        return {
          countryCode: code,
          countryName: countryInfo?.country_name_id || primaryCountry?.countryName || overlayCountry?.countryName || code,
          flagEmoji: countryInfo?.flag_emoji || '??',
          primaryValues,
          overlayValues,
        };
      });

      const chartData = sortedYearsAsc.map((year) => {
        const row: Record<string, string | number | null> = { period: year };

        selectedCountries.forEach((code) => {
          const countryInfo = ASEAN_COUNTRIES.find((item) => item.country_code === code);
          const label = countryInfo ? `${countryInfo.flag_emoji} ${countryInfo.country_name_id}` : code;
          const primaryCountry = findCountryData(primaryData, code);
          const overlayCountry = findCountryData(overlayData, code);

          row[label] =
            primaryCountry?.indicators[topic.id]?.values.find((value) => value.year === year)?.value ?? null;
          row[`${label} (WB)`] =
            overlayCountry?.indicators[topic.id]?.values.find((value) => value.year === year)?.value ?? null;
        });

        return row;
      });

      const chartLines = selectedCountries.flatMap((code, index) => {
        const countryInfo = ASEAN_COUNTRIES.find((item) => item.country_code === code);
        const label = countryInfo ? `${countryInfo.flag_emoji} ${countryInfo.country_name_id}` : code;
        const baseColor = LINE_COLORS[index % LINE_COLORS.length];

        const baseLine = {
          dataKey: label,
          label,
          color: baseColor,
        };

        if (!showWorldBankOverlay) {
          return [baseLine];
        }

        return [
          baseLine,
          {
            dataKey: `${label} (WB)`,
            label: `${label} (WB)`,
            color: baseColor,
            strokeDasharray: '6 4',
          },
        ];
      });

      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        yearsTable: sortedYearsDesc,
        tableRows,
        chartData,
        chartLines,
        metadata,
      };
    });
  }, [comparableData?.metadata, effectiveSelectedYears, overlayData, primaryData, selectedCountries, showWorldBankOverlay]);

  if (!primaryData || topicTables.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-center text-[var(--app-muted)]">
        Data historis ASEAN tidak tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--app-text)]">Panel Kontrol Filter Wilayah, Tahun, dan Lapisan Sumber</h3>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-[var(--app-text)]">Default grafik dan tabel</p>
            <p className="text-xs text-[var(--app-muted)]">Indonesia diprioritaskan ke seri resmi BPS. Lapisan World Bank tetap tersedia, namun tidak aktif saat halaman dibuka.</p>
          </div>
          <button
            onClick={() => setShowWorldBankOverlay((prev) => !prev)}
            className={`ml-auto flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
              showWorldBankOverlay
                ? 'border-[var(--app-teal)] bg-[color:color-mix(in_srgb,var(--app-teal)_18%,transparent)] text-[var(--app-teal)]'
                : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)]'
            }`}
          >
            <Layers3 className="h-3.5 w-3.5" />
            <span>{showWorldBankOverlay ? 'Sembunyikan World Bank' : 'Tambahkan World Bank'}</span>
          </button>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-semibold text-[var(--app-muted)]">Filter Negara ASEAN (Pilih untuk Menyertakan/Mengecualikan):</span>
          <div className="flex flex-wrap gap-2">
            {ASEAN_COUNTRIES.map((country) => {
              const isActive = selectedCountries.includes(country.country_code);
              return (
                <button
                  key={country.country_code}
                  onClick={() => toggleCountry(country.country_code)}
                  className={`flex cursor-pointer items-center space-x-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs ${
                    isActive
                      ? 'border-[var(--app-teal)] bg-[color:color-mix(in_srgb,var(--app-teal)_18%,transparent)] text-[var(--app-teal)] font-bold'
                      : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)]'
                  }`}
                >
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--app-teal)]" />}
                  <span>{country.flag_emoji}</span>
                  <span>{country.country_name_id}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-semibold text-[var(--app-muted)]">Filter Titik Data Tahun (Pilih untuk Menyertakan/Mengecualikan):</span>
          <div className="flex flex-wrap gap-2">
            {availableYears.map((year) => {
              const isActive = effectiveSelectedYears.includes(year);
              return (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  className={`flex cursor-pointer items-center space-x-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs ${
                    isActive
                      ? 'border-[var(--app-teal)] bg-[color:color-mix(in_srgb,var(--app-teal)_18%,transparent)] text-[var(--app-teal)] font-bold'
                      : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)]'
                  }`}
                >
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--app-teal)]" />}
                  <span>{year}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {topicTables.map((topic) => {
        const activeTab = activeTabs[topic.id] || 'chart';
        const setTab = (tab: 'chart' | 'table') => setActiveTabs((prev) => ({ ...prev, [topic.id]: tab }));

        return (
          <div key={topic.id} className="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xs">
            <div className="flex flex-col justify-between gap-4 border-b border-[var(--app-border)] bg-[var(--app-bg-soft)] px-5 py-4 md:flex-row md:items-center">
              <div>
                <h3 className="text-base font-semibold text-[var(--app-text)]">{topic.title}</h3>
                <p className="mt-1 text-xs text-[var(--app-muted)]">{topic.description}</p>
              </div>

              <div className="flex flex-shrink-0 items-center space-x-3 self-start md:self-center">
                <div className="flex space-x-1 rounded-md bg-[var(--app-border)]/30 p-1">
                  <button
                    onClick={() => setTab('chart')}
                    className={`flex cursor-pointer items-center space-x-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                      activeTab === 'chart'
                        ? 'bg-[var(--app-surface)] text-[var(--app-teal)] shadow-2xs'
                        : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Grafik</span>
                  </button>
                  <button
                    onClick={() => setTab('table')}
                    className={`flex cursor-pointer items-center space-x-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                      activeTab === 'table'
                        ? 'bg-[var(--app-surface)] text-[var(--app-teal)] shadow-2xs'
                        : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    <Table className="h-3.5 w-3.5" />
                    <span>Tabel</span>
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'chart' ? (
              <div className="space-y-4 p-5">
                <div id={`asean-chart-${topic.id}`} className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
                  <LineChart
                    data={topic.chartData}
                    xKey="period"
                    lines={topic.chartLines}
                    height={350}
                    yDomain={[0, 'auto']}
                    valueFormatter={(val) => `${formatNumber(Number(val), 2)}%`}
                  />
                </div>
                <MetadataPanel metadata={topic.metadata} />
              </div>
            ) : (
              <div className="space-y-4 p-5">
                <div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--app-border)] bg-[var(--app-bg-soft)]">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--app-subtle)]">Negara</th>
                        {topic.yearsTable.map((year) => (
                          <th key={year} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--app-subtle)]">
                            {year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--app-border)]">
                      {topic.tableRows.length === 0 ? (
                        <tr>
                          <td colSpan={topic.yearsTable.length + 1} className="py-8 text-center text-[var(--app-subtle)]">
                            Tidak ada negara yang dipilih. Silakan aktifkan negara pada filter di atas.
                          </td>
                        </tr>
                      ) : (
                        topic.tableRows.map((row) => (
                          <tr key={row.countryCode} className="transition-colors hover:bg-[var(--app-bg-soft)]">
                            <td className="whitespace-nowrap px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg">{row.flagEmoji}</span>
                                <span className="font-semibold text-[var(--app-text)]">{row.countryName}</span>
                              </div>
                            </td>
                            {topic.yearsTable.map((year) => {
                              const primaryValue = row.primaryValues[year];
                              const overlayValue = row.overlayValues[year];
                              return (
                                <td key={year} className="px-4 py-3.5 text-right align-top">
                                  <div className="font-medium text-[var(--app-text)]">
                                    {primaryValue !== undefined && primaryValue !== null ? formatPercent(primaryValue) : <span className="text-[var(--app-subtle)]">-</span>}
                                  </div>
                                  {showWorldBankOverlay && (
                                    <div className="mt-1 text-[11px] text-[var(--app-muted)]">
                                      WB:{' '}
                                      {overlayValue !== undefined && overlayValue !== null ? formatPercent(overlayValue) : '-'}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <MetadataPanel metadata={topic.metadata} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
