'use client';

import { useState, useMemo } from 'react';
import { ASEANCountryData } from '@/types';
import { ASEANHistoricalData } from '@/lib/data-loader-server';
import { formatPercent, formatNumber } from '@/lib/utils';
import { ASEAN_COUNTRIES } from '@/lib/constants';
import LineChart from '@/components/charts/LineChart';
import { TrendingUp, Table, Globe, Check } from 'lucide-react';

interface MakroASEANClientProps {
  aseanData: ASEANCountryData[];
  historicalData: ASEANHistoricalData | null;
}

const LINE_COLORS = ['#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#10B981', '#6366F1', '#475569', '#14B8A6'];

export default function MakroASEANClient({ aseanData, historicalData }: MakroASEANClientProps) {
  // Global states for filters
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['IDN', 'MYS', 'SGP', 'THA']); // Pre-selected by default
  const [selectedYears, setSelectedYears] = useState<string[]>(['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025']);
  
  // Track active tab ('chart' or 'table') per topic ID
  const [activeTabs, setActiveTabs] = useState<Record<string, 'chart' | 'table'>>({});

  // Determine all years available across all countries and indicators
  const availableYears = useMemo(() => {
    if (!historicalData) return [];
    const allYears = new Set<string>();
    historicalData.countries.forEach(country => {
      Object.values(country.indicators).forEach(ind => {
        ind.values.forEach(v => {
          if (v.year) allYears.add(v.year);
        });
      });
    });
    return Array.from(allYears).sort((a, b) => b.localeCompare(a)); // Descending e.g. 2025 -> 2018
  }, [historicalData]);

  // Toggle country in/out of selected list
  const toggleCountry = (code: string) => {
    if (selectedCountries.includes(code)) {
      if (selectedCountries.length > 1) {
        setSelectedCountries(selectedCountries.filter(c => c !== code));
      }
    } else {
      setSelectedCountries([...selectedCountries, code]);
    }
  };

  // Toggle year in/out of selected list
  const toggleYear = (year: string) => {
    if (selectedYears.includes(year)) {
      if (selectedYears.length > 1) {
        setSelectedYears(selectedYears.filter(y => y !== year));
      }
    } else {
      setSelectedYears([...selectedYears, year]);
    }
  };

  // Process data for charts and tables based on selected filters
  const topicTables = useMemo(() => {
    if (!historicalData) return [];

    const sortedYearsAsc = [...selectedYears].sort((a, b) => a.localeCompare(b)); // Chronological for line chart
    const sortedYearsDesc = [...selectedYears].sort((a, b) => b.localeCompare(a)); // Reverse chronological for table

    const topicsDef = [
      {
        id: 'SL.UEM.TOTL.ZS',
        title: 'Tingkat Pengangguran Terbuka (%)',
        description: 'Persentase angkatan kerja yang tidak bekerja namun aktif mencari pekerjaan (model estimasi ILO / World Bank).'
      },
      {
        id: 'SL.TLF.CACT.ZS',
        title: 'Tingkat Partisipasi Angkatan Kerja (TPAK) (%)',
        description: 'Persentase penduduk usia kerja (15 tahun ke atas) yang aktif secara ekonomi (bekerja atau mencari kerja).'
      },
      {
        id: 'SL.EMP.TOTL.SP.ZS',
        title: 'Rasio Pekerja terhadap Populasi (%)',
        description: 'Persentase jumlah penduduk bekerja terhadap total populasi usia kerja.'
      }
    ];

    return topicsDef.map(topic => {
      // 1. Process Table Rows (filtered by selected countries & years)
      const tableRows = historicalData.countries
        .filter(country => {
          const cInfo = ASEAN_COUNTRIES.find(
            c => c.country_name_en === country.countryName || c.country_name_id === country.countryName
          );
          return cInfo && selectedCountries.includes(cInfo.country_code);
        })
        .map(country => {
          const cInfo = ASEAN_COUNTRIES.find(
            c => c.country_name_en === country.countryName || c.country_name_id === country.countryName
          );
          
          const yearValues: Record<string, number | null> = {};
          selectedYears.forEach(year => {
            const valObj = country.indicators[topic.id]?.values.find(v => v.year === year);
            yearValues[year] = valObj ? valObj.value : null;
          });

          return {
            countryCode: cInfo?.country_code || '',
            countryName: cInfo?.country_name_id || country.countryName,
            flagEmoji: cInfo?.flag_emoji || '🏳️',
            yearValues
          };
        });

      // 2. Process Line Chart Data (filtered by selected countries & years, sorted chronologically)
      const chartData = sortedYearsAsc.map(year => {
        const dataRow: Record<string, any> = { period: year };
        selectedCountries.forEach(code => {
          const cInfo = ASEAN_COUNTRIES.find(ac => ac.country_code === code);
          const country = historicalData.countries.find(
            c => c.countryName === cInfo?.country_name_en || c.countryName === cInfo?.country_name_id
          );
          const valObj = country?.indicators[topic.id]?.values.find(v => v.year === year);
          const label = cInfo ? `${cInfo.flag_emoji} ${cInfo.country_name_id}` : code;
          dataRow[label] = valObj ? valObj.value : null;
        });
        return dataRow;
      });

      // 3. Process Line Config for Recharts
      const chartLines = selectedCountries.map((code, index) => {
        const cInfo = ASEAN_COUNTRIES.find(ac => ac.country_code === code);
        const label = cInfo ? `${cInfo.flag_emoji} ${cInfo.country_name_id}` : code;
        return {
          dataKey: label,
          label: label,
          color: LINE_COLORS[index % LINE_COLORS.length]
        };
      });

      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        yearsTable: sortedYearsDesc,
        tableRows,
        chartData,
        chartLines
      };
    });
  }, [historicalData, selectedCountries, selectedYears]);

  if (!historicalData || topicTables.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-center text-[var(--app-muted)]">
        Data historis ASEAN tidak tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Block */}
      <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-[var(--app-text)]">
          <Globe className="w-5 h-5 text-[var(--app-teal)]" />
          <span>Data Makro ASEAN (World Bank / ILO)</span>
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-[var(--app-muted)]">
          Halaman ini menampilkan visualisasi grafik interaktif dan tabel data historis untuk 10 negara anggota ASEAN. 
          Gunakan filter di bawah untuk membandingkan indikator ketenagakerjaan utama antar negara secara fleksibel.
        </p>
        <a href={historicalData._source_url} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-[var(--app-teal)] hover:underline">
          <span>Akses Sumber Data Asli (World Bank API)</span>
          <span>↗</span>
        </a>
      </div>

      {/* Global Interactive Controls Panel */}
      <div className="space-y-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-2xs">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--app-text)]">Panel Kontrol Filter Wilayah & Tahun</h3>
        
        {/* Country Filter */}
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

        {/* Year Filter */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-[var(--app-muted)]">Filter Titik Data Tahun (Pilih untuk Menyertakan/Mengecualikan):</span>
          <div className="flex flex-wrap gap-2">
            {availableYears.map((year) => {
              const isActive = selectedYears.includes(year);
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

      {/* Topics Sections */}
      {topicTables.map((topic) => {
        const activeTab = activeTabs[topic.id] || 'chart';
        const setTab = (tab: 'chart' | 'table') => setActiveTabs(prev => ({ ...prev, [topic.id]: tab }));

        return (
          <div key={topic.id} className="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xs">
            {/* Topic Header with Switcher Tabs & Actions */}
            <div className="flex flex-col justify-between gap-4 border-b border-[var(--app-border)] bg-[var(--app-bg-soft)] px-5 py-4 md:flex-row md:items-center">
              <div>
                <h3 className="text-base font-semibold text-[var(--app-text)]">{topic.title}</h3>
                <p className="mt-1 text-xs text-[var(--app-muted)]">{topic.description}</p>
              </div>

              <div className="flex items-center space-x-3 self-start md:self-center flex-shrink-0">
                {/* Chart/Table Selector */}
                <div className="flex space-x-1 rounded-md bg-[var(--app-border)]/30 p-1">
                  <button
                    onClick={() => setTab('chart')}
                    className={`flex cursor-pointer items-center space-x-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${activeTab === 'chart' ? 'bg-[var(--app-surface)] text-[var(--app-teal)] shadow-2xs' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Grafik</span>
                  </button>
                  <button
                    onClick={() => setTab('table')}
                    className={`flex cursor-pointer items-center space-x-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${activeTab === 'table' ? 'bg-[var(--app-surface)] text-[var(--app-teal)] shadow-2xs' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Tabel</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Body */}
            {activeTab === 'chart' ? (
              /* Time Series Line Chart View */
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
                  {/* Source Citation at the bottom of the chart */}
                  <div className="mt-3 border-t border-[var(--app-border)] pt-2 text-center text-[11px] font-medium text-[var(--app-subtle)]">
                    Sumber: World Bank / ILO (Estimasi Model)
                  </div>
                </div>
              </div>
            ) : (
              /* Filtered Data Table View */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--app-border)] bg-[var(--app-bg-soft)]">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--app-subtle)]">Negara</th>
                      {topic.yearsTable.map(year => (
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
                      topic.tableRows.map((row, idx) => (
                        <tr key={idx} className="transition-colors hover:bg-[var(--app-bg-soft)]">
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">{row.flagEmoji}</span>
                              <span className="font-semibold text-[var(--app-text)]">{row.countryName}</span>
                            </div>
                          </td>
                          {topic.yearsTable.map(year => {
                            const val = row.yearValues[year];
                            return (
                              <td key={year} className="px-4 py-3.5 text-right font-medium text-[var(--app-text)]">
                                {val !== undefined && val !== null ? formatPercent(val) : <span className="text-[var(--app-subtle)]">-</span>}
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
