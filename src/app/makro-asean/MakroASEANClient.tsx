'use client';

import { useState, useMemo } from 'react';
import { ASEANCountryData } from '@/types';
import { ASEANHistoricalData } from '@/lib/data-loader-server';
import { formatPercent, formatNumber } from '@/lib/utils';
import { ASEAN_COUNTRIES } from '@/lib/constants';
import LineChart from '@/components/charts/LineChart';
import { Copy, Download, TrendingUp, Table, Globe, Check } from 'lucide-react';

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
  
  // Track copying status ('Menyalin...' or 'Mengunduh...') per topic ID
  const [copyStatus, setCopyStatus] = useState<Record<string, string>>({});

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

  // Copy or download chart as PNG
  const handleCopyChart = async (topicId: string, downloadOnly = false) => {
    try {
      setCopyStatus(prev => ({ ...prev, [topicId]: downloadOnly ? 'Mengunduh...' : 'Menyalin...' }));
      const chartContainer = document.getElementById(`asean-chart-${topicId}`);
      if (!chartContainer) {
        alert('Gagal mendeteksi kontainer grafik.');
        setCopyStatus(prev => ({ ...prev, [topicId]: '' }));
        return;
      }
      const svgElement = chartContainer.querySelector('svg');
      if (!svgElement) {
        alert('Gagal mendeteksi elemen SVG grafik.');
        setCopyStatus(prev => ({ ...prev, [topicId]: '' }));
        return;
      }

      const width = svgElement.clientWidth || svgElement.getBoundingClientRect().width || 800;
      const height = svgElement.clientHeight || svgElement.getBoundingClientRect().height || 400;

      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setCopyStatus(prev => ({ ...prev, [topicId]: '' }));
        return;
      }

      ctx.scale(2, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = async () => {
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        if (downloadOnly) {
          const downloadUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `asean-chart-${topicId}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setCopyStatus(prev => ({ ...prev, [topicId]: '' }));
        } else {
          canvas.toBlob(async (blob) => {
            if (!blob) {
              setCopyStatus(prev => ({ ...prev, [topicId]: '' }));
              return;
            }
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  [blob.type]: blob
                })
              ]);
              alert('Grafik berhasil disalin ke clipboard sebagai PNG! Anda dapat langsung mem-paste (Ctrl+V) di dokumen/chat.');
            } catch (clipErr) {
              console.warn('Clipboard write failed, downloading instead:', clipErr);
              const downloadUrl = canvas.toDataURL('image/png');
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = `asean-chart-${topicId}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              alert('Penyalinan clipboard dibatasi browser. Grafik telah diunduh sebagai file PNG.');
            }
            setCopyStatus(prev => ({ ...prev, [topicId]: '' }));
          }, 'image/png');
        }
      };
      img.src = url;
    } catch (err) {
      console.error('Error handling chart copy:', err);
      alert('Terjadi kesalahan saat memproses gambar.');
      setCopyStatus(prev => ({ ...prev, [topicId]: '' }));
    }
  };

  if (!historicalData || topicTables.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5 text-center text-gray-500">
        Data historis ASEAN tidak tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Block */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Globe className="w-5 h-5 text-teal-600" />
          <span>Data Makro ASEAN (World Bank / ILO)</span>
        </h2>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          Halaman ini menampilkan visualisasi grafik interaktif dan tabel data historis untuk 10 negara anggota ASEAN. 
          Gunakan filter di bawah untuk membandingkan indikator ketenagakerjaan utama antar negara secara fleksibel.
        </p>
        <a href={historicalData._source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0D9488] hover:underline font-semibold flex items-center gap-1.5 w-fit">
          <span>Akses Sumber Data Asli (World Bank API)</span>
          <span>↗</span>
        </a>
      </div>

      {/* Global Interactive Controls Panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-2xs">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Panel Kontrol Filter Wilayah & Tahun</h3>
        
        {/* Country Filter */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-gray-500 block">Filter Negara ASEAN (Pilih untuk Menyertakan/Mengecualikan):</span>
          <div className="flex flex-wrap gap-2">
            {ASEAN_COUNTRIES.map((country) => {
              const isActive = selectedCountries.includes(country.country_code);
              return (
                <button
                  key={country.country_code}
                  onClick={() => toggleCountry(country.country_code)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${isActive ? 'bg-teal-50 border-teal-500 text-teal-700 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {isActive && <Check className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />}
                  <span>{country.flag_emoji}</span>
                  <span>{country.country_name_id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Year Filter */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-gray-500 block">Filter Titik Data Tahun (Pilih untuk Menyertakan/Mengecualikan):</span>
          <div className="flex flex-wrap gap-2">
            {availableYears.map((year) => {
              const isActive = selectedYears.includes(year);
              return (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${isActive ? 'bg-teal-50 border-teal-500 text-teal-700 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {isActive && <Check className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />}
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
        const currentCopyStatus = copyStatus[topic.id] || '';

        return (
          <div key={topic.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs">
            {/* Topic Header with Switcher Tabs & Actions */}
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{topic.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{topic.description}</p>
              </div>

              <div className="flex items-center space-x-3 self-start md:self-center flex-shrink-0">
                {/* Chart/Table Selector */}
                <div className="flex space-x-1 bg-gray-200/60 p-1 rounded-md">
                  <button
                    onClick={() => setTab('chart')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center space-x-1 ${activeTab === 'chart' ? 'bg-white text-teal-600 shadow-2xs' : 'text-gray-600 hover:text-gray-950'}`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Grafik</span>
                  </button>
                  <button
                    onClick={() => setTab('table')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center space-x-1 ${activeTab === 'table' ? 'bg-white text-teal-600 shadow-2xs' : 'text-gray-600 hover:text-gray-950'}`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Tabel</span>
                  </button>
                </div>

                {/* PNG Copy Actions (only shown if chart is active) */}
                {activeTab === 'chart' && (
                  <div className="flex items-center space-x-1.5">
                    <button
                      disabled={currentCopyStatus !== ''}
                      onClick={() => handleCopyChart(topic.id, false)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 shadow-2xs cursor-pointer transition-colors disabled:opacity-50"
                      title="Salin Grafik ke Clipboard (PNG)"
                    >
                      <Copy className="w-3 h-3" />
                      <span className="hidden sm:inline">{currentCopyStatus === 'Menyalin...' ? 'Menyalin...' : 'Salin PNG'}</span>
                    </button>
                    <button
                      disabled={currentCopyStatus !== ''}
                      onClick={() => handleCopyChart(topic.id, true)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 shadow-2xs cursor-pointer transition-colors disabled:opacity-50"
                      title="Unduh Grafik sebagai File PNG"
                    >
                      <Download className="w-3 h-3" />
                      <span className="hidden sm:inline">{currentCopyStatus === 'Mengunduh...' ? 'Mengunduh...' : 'Unduh'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tab Body */}
            {activeTab === 'chart' ? (
              /* Time Series Line Chart View */
              <div className="p-5 space-y-4">
                <div id={`asean-chart-${topic.id}`} className="bg-white p-3 border border-gray-100 rounded-lg">
                  <LineChart
                    data={topic.chartData}
                    xKey="year"
                    lines={topic.chartLines}
                    height={350}
                    yDomain={[0, 'auto']}
                    valueFormatter={(val) => `${formatNumber(Number(val), 2)}%`}
                  />
                  {/* Source Citation at the bottom of the chart */}
                  <div className="mt-3 text-center border-t border-gray-50 pt-2 text-[11px] text-gray-400 font-medium">
                    Sumber: World Bank / ILO (Estimasi Model)
                  </div>
                </div>
              </div>
            ) : (
              /* Filtered Data Table View */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="text-left py-3 px-5 font-semibold text-gray-600 uppercase tracking-wide text-xs">Negara</th>
                      {topic.yearsTable.map(year => (
                        <th key={year} className="text-right py-3 px-4 font-semibold text-gray-600 uppercase tracking-wide text-xs">
                          {year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topic.tableRows.length === 0 ? (
                      <tr>
                        <td colSpan={topic.yearsTable.length + 1} className="py-8 text-center text-gray-400">
                          Tidak ada negara yang dipilih. Silakan aktifkan negara pada filter di atas.
                        </td>
                      </tr>
                    ) : (
                      topic.tableRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">{row.flagEmoji}</span>
                              <span className="font-semibold text-gray-900">{row.countryName}</span>
                            </div>
                          </td>
                          {topic.yearsTable.map(year => {
                            const val = row.yearValues[year];
                            return (
                              <td key={year} className="py-3.5 px-4 text-right font-medium text-gray-800">
                                {val !== undefined && val !== null ? formatPercent(val) : <span className="text-gray-300">-</span>}
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
