'use client';

import { useMemo, useState } from 'react';
import { ASEANHistoricalData } from '@/lib/data-loader-server';
import { formatPercent, formatNumber } from '@/lib/utils';
import { ASEAN_COUNTRIES } from '@/lib/constants';
import LineChart from '@/components/charts/LineChart';
import { TrendingUp, Table, Check } from 'lucide-react';

interface MakroASEANClientProps {
  historicalData: ASEANHistoricalData | null;
}

const LINE_COLORS = ['#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#10B981', '#6366F1', '#475569', '#14B8A6'];

function getAvailableYears(historicalData: ASEANHistoricalData | null): string[] {
  if (!historicalData) return [];
  const allYears = new Set<string>();
  historicalData.countries.forEach((country) => {
    Object.values(country.indicators).forEach((indicator) => {
      indicator.values.forEach((value) => {
        if (value.year) {
          allYears.add(value.year);
        }
      });
    });
  });

  return Array.from(allYears).sort((a, b) => b.localeCompare(a));
}

function getInitialSelectedYears(historicalData: ASEANHistoricalData | null): string[] {
  const availableYears = getAvailableYears(historicalData);
  if (availableYears.length === 0) {
    return ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
  }

  return [...availableYears]
    .slice(0, 8)
    .sort((a, b) => a.localeCompare(b));
}

export default function MakroASEANClient({ historicalData }: MakroASEANClientProps) {
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['IDN', 'MYS', 'SGP', 'THA']);
  const [selectedYears, setSelectedYears] = useState<string[]>(() => getInitialSelectedYears(historicalData));
  const [activeTabs, setActiveTabs] = useState<Record<string, 'chart' | 'table'>>({});

  const availableYears = useMemo(() => getAvailableYears(historicalData), [historicalData]);

  const effectiveSelectedYears = useMemo(() => {
    const validCurrentYears = selectedYears.filter((year) => availableYears.includes(year));
    if (validCurrentYears.length > 0) {
      return validCurrentYears;
    }
    return getInitialSelectedYears(historicalData);
  }, [availableYears, historicalData, selectedYears]);

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

  const topicTables = useMemo(() => {
    if (!historicalData) return [];

    const sortedYearsAsc = [...effectiveSelectedYears].sort((a, b) => a.localeCompare(b));
    const sortedYearsDesc = [...effectiveSelectedYears].sort((a, b) => b.localeCompare(a));

    const topicsDef = [
      {
        id: 'SL.UEM.TOTL.ZS',
        title: 'Tingkat Pengangguran Terbuka (%)',
        description: 'Persentase angkatan kerja yang tidak bekerja namun aktif mencari pekerjaan (model estimasi ILO / World Bank).',
      },
      {
        id: 'SL.TLF.CACT.ZS',
        title: 'Tingkat Partisipasi Angkatan Kerja (TPAK) (%)',
        description: 'Persentase penduduk usia kerja (15 tahun ke atas) yang aktif secara ekonomi (bekerja atau mencari kerja).',
      },
      {
        id: 'SL.EMP.TOTL.SP.ZS',
        title: 'Rasio Pekerja terhadap Populasi (%)',
        description: 'Persentase jumlah penduduk bekerja terhadap total populasi usia kerja.',
      },
    ];

    return topicsDef.map((topic) => {
      const tableRows = historicalData.countries
        .filter((country) => {
          const cInfo = ASEAN_COUNTRIES.find(
            (item) => item.country_name_en === country.countryName || item.country_name_id === country.countryName
          );
          return cInfo && selectedCountries.includes(cInfo.country_code);
        })
        .map((country) => {
          const cInfo = ASEAN_COUNTRIES.find(
            (item) => item.country_name_en === country.countryName || item.country_name_id === country.countryName
          );

          const yearValues: Record<string, number | null> = {};
          effectiveSelectedYears.forEach((year) => {
            const valObj = country.indicators[topic.id]?.values.find((value) => value.year === year);
            yearValues[year] = valObj ? valObj.value : null;
          });

          return {
            countryCode: cInfo?.country_code || '',
            countryName: cInfo?.country_name_id || country.countryName,
            flagEmoji: cInfo?.flag_emoji || '🏳️',
            yearValues,
          };
        });

      const chartData = sortedYearsAsc.map((year) => {
        const dataRow: Record<string, string | number | null> = { period: year };
        selectedCountries.forEach((code) => {
          const cInfo = ASEAN_COUNTRIES.find((item) => item.country_code === code);
          const country = historicalData.countries.find(
            (item) => item.countryName === cInfo?.country_name_en || item.countryName === cInfo?.country_name_id
          );
          const valObj = country?.indicators[topic.id]?.values.find((value) => value.year === year);
          const label = cInfo ? `${cInfo.flag_emoji} ${cInfo.country_name_id}` : code;
          dataRow[label] = valObj ? valObj.value : null;
        });
        return dataRow;
      });

      const chartLines = selectedCountries.map((code, index) => {
        const cInfo = ASEAN_COUNTRIES.find((item) => item.country_code === code);
        const label = cInfo ? `${cInfo.flag_emoji} ${cInfo.country_name_id}` : code;
        return {
          dataKey: label,
          label,
          color: LINE_COLORS[index % LINE_COLORS.length],
        };
      });

      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        yearsTable: sortedYearsDesc,
        tableRows,
        chartData,
        chartLines,
      };
    });
  }, [effectiveSelectedYears, historicalData, selectedCountries]);

  if (!historicalData || topicTables.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-center text-[var(--app-muted)]">
        Data historis ASEAN tidak tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-2xs">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--app-text)]">Panel Kontrol Filter Wilayah & Tahun</h3>

        <div className="space-y-2">
          <span className="block text-xs font-semibold text-[var(--app-muted)]">Filter Negara ASEAN (Pilih untuk Menyertakan/Mengecualikan):</span>
          <div className="flex flex-wrap gap-2">
            {ASEAN_COUNTRIES.map((country) => {
              const isActive = selectedCountries.includes(country.country_code);
              return (
                <button
                  key={country.country_code}
                  onClick={() => toggleCountry(country.country_code)}
                  className={`flex cursor-pointer items-center space-x-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs ${isActive ? 'border-[var(--app-teal)] bg-[color:color-mix(in_srgb,var(--app-teal)_18%,transparent)] text-[var(--app-teal)] font-bold' : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)]'}`}
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
                  className={`flex cursor-pointer items-center space-x-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs ${isActive ? 'border-[var(--app-teal)] bg-[color:color-mix(in_srgb,var(--app-teal)_18%,transparent)] text-[var(--app-teal)] font-bold' : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)]'}`}
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
                    className={`flex cursor-pointer items-center space-x-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${activeTab === 'chart' ? 'bg-[var(--app-surface)] text-[var(--app-teal)] shadow-2xs' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Grafik</span>
                  </button>
                  <button
                    onClick={() => setTab('table')}
                    className={`flex cursor-pointer items-center space-x-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${activeTab === 'table' ? 'bg-[var(--app-surface)] text-[var(--app-teal)] shadow-2xs' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                  >
                    <Table className="h-3.5 w-3.5" />
                    <span>Tabel</span>
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'chart' ? (
              <div className="p-5 space-y-4">
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
                <div className="text-xs text-[var(--app-subtle)]">
                  Sumber: World Bank / ILO (estimasi model).{' '}
                  <a
                    href={historicalData._source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--app-link)] hover:underline focus-visible:app-focus"
                  >
                    Buka sumber data
                  </a>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                      topic.tableRows.map((row, index) => (
                        <tr key={index} className="transition-colors hover:bg-[var(--app-bg-soft)]">
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">{row.flagEmoji}</span>
                              <span className="font-semibold text-[var(--app-text)]">{row.countryName}</span>
                            </div>
                          </td>
                          {topic.yearsTable.map((year) => {
                            const value = row.yearValues[year];
                            return (
                              <td key={year} className="px-4 py-3.5 text-right font-medium text-[var(--app-text)]">
                                {value !== undefined && value !== null ? formatPercent(value) : <span className="text-[var(--app-subtle)]">-</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
