'use client';

import { useState, useMemo } from 'react';
import { ASEANCountryData } from '@/types';
import { ASEANHistoricalData } from '@/lib/data-loader-server';
import { formatPercent } from '@/lib/utils';
import CountryCard from '@/components/cards/CountryCard';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';

type SortField = 'country' | 'unemployment' | 'lfpr';
type SortDir = 'asc' | 'desc';

interface MakroASEANClientProps {
  aseanData: ASEANCountryData[];
  historicalData: ASEANHistoricalData | null;
}

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
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left cursor-pointer mb-1"
      >
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

export default function MakroASEANClient({ aseanData, historicalData }: MakroASEANClientProps) {
  const [sortField, setSortField] = useState<SortField>('unemployment');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(
    aseanData.map((c) => c.country_name_id)
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    return [...aseanData].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      if (sortField === 'country') {
        aVal = a.country_name_id;
        bVal = b.country_name_id;
      } else if (sortField === 'unemployment') {
        aVal = a.indicators.unemployment_rate?.value ?? 0;
        bVal = b.indicators.unemployment_rate?.value ?? 0;
      } else if (sortField === 'lfpr') {
        aVal = a.indicators.lfpr?.value ?? 0;
        bVal = b.indicators.lfpr?.value ?? 0;
      }

      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [aseanData, sortField, sortDir]);

  // Bar chart data sorted by unemployment rate
  const barData = [...aseanData]
    .sort((a, b) => (b.indicators.unemployment_rate?.value ?? 0) - (a.indicators.unemployment_rate?.value ?? 0))
    .map((c) => ({
      negara: c.country_name_id,
      'Tingkat Pengangguran (%)': c.indicators.unemployment_rate?.value ?? 0,
    }));

  // Pivot historical data for Unemployment Line Chart
  const unemploymentChartData = useMemo(() => {
    if (!historicalData) return [];
    const yearMap: Record<string, any> = {};
    historicalData.countries.forEach(country => {
      const data = country.indicators['SL.UEM.TOTL.ZS']?.values;
      if (data) {
        data.forEach(dp => {
          if (!yearMap[dp.year]) yearMap[dp.year] = { year: dp.year };
          yearMap[dp.year][country.countryName] = dp.value;
        });
      }
    });
    return Object.values(yearMap).sort((a, b) => a.year.localeCompare(b.year));
  }, [historicalData]);

  // Pivot historical data for LFPR Line Chart
  const lfprChartData = useMemo(() => {
    if (!historicalData) return [];
    const yearMap: Record<string, any> = {};
    historicalData.countries.forEach(country => {
      const data = country.indicators['SL.TLF.CACT.ZS']?.values;
      if (data) {
        data.forEach(dp => {
          if (!yearMap[dp.year]) yearMap[dp.year] = { year: dp.year };
          yearMap[dp.year][country.countryName] = dp.value;
        });
      }
    });
    return Object.values(yearMap).sort((a, b) => a.year.localeCompare(b.year));
  }, [historicalData]);
  
  // Create line configurations dynamically based on available countries
  const lineChartLines = useMemo(() => {
    if (!historicalData) return [];
    const colors = [
      '#0D9488', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', 
      '#EC4899', '#10B981', '#6366F1', '#F43F5E', '#14B8A6'
    ];
    return historicalData.countries
      .filter((c) => selectedCountries.includes(c.countryName))
      .map((c, i) => ({
        dataKey: c.countryName,
        label: c.countryName,
        color: colors[i % colors.length]
      }));
  }, [historicalData, selectedCountries]);

  const toggleCountry = (country: string) => {
    setSelectedCountries((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country]
    );
  };

  const selectAll = () => setSelectedCountries(aseanData.map((c) => c.country_name_id));
  const deselectAll = () => setSelectedCountries([]);

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700 cursor-pointer"
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-[#0D9488]' : 'text-gray-300'}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Country Cards Grid */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Negara ASEAN</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {aseanData.map((country) => {
            const countryHist = historicalData?.countries.find(c => c.countryName === country.country_name_id);
            const sparkData = countryHist?.indicators['SL.UEM.TOTL.ZS']?.values
                .filter(v => v.value !== null)
                .map(v => ({ value: v.value as number }))
                .reverse() || [];
            
            // Get latest available employment ratio (2024 or 2025)
            const empValues = countryHist?.indicators['SL.EMP.TOTL.SP.ZS']?.values || [];
            const empRatioStr = empValues.find(v => v.year === '2025')?.value || empValues.find(v => v.year === '2024')?.value;
            const empRatio = empRatioStr !== undefined ? empRatioStr : undefined;

            return (
              <CountryCard
                key={country.country_code}
                flagEmoji={country.flag_emoji}
                countryName={country.country_name_id}
                nsoName={country.nso_name}
                nsoUrl={country.nso_url}
                unemploymentRate={country.indicators.unemployment_rate?.value}
                unemploymentPeriod={country.indicators.unemployment_rate?.period}
                lfpr={country.indicators.lfpr?.value}
                employmentRatio={empRatio ?? undefined}
                sparkData={sparkData}
                dataTier={country.data_tier}
                lastUpdated={country.last_updated}
                sourceUrl={country.indicators.unemployment_rate?._source_url}
              />
            );
          })}
        </div>
      </div>

      {/* Country Selector for Charts */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Pilih Negara untuk Grafik</h2>
          <div className="space-x-3 text-sm">
            <button onClick={selectAll} className="text-[#0D9488] hover:underline font-medium">Pilih Semua</button>
            <span className="text-gray-300">|</span>
            <button onClick={deselectAll} className="text-gray-500 hover:underline">Hapus Semua</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {aseanData.map((country) => {
            const isSelected = selectedCountries.includes(country.country_name_id);
            return (
              <button
                key={country.country_code}
                onClick={() => toggleCountry(country.country_name_id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-teal-50 border-teal-200 text-teal-800'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span>{country.flag_emoji}</span>
                {country.country_name_id}
              </button>
            );
          })}
        </div>
      </div>

      {historicalData && unemploymentChartData.length > 0 && (
        <CollapsibleSection title="Tren Pengangguran ASEAN (2018 - 2025)">
          <p className="text-sm text-gray-500 mb-4">
            Perkembangan tingkat pengangguran (Unemployment Rate) berdasarkan data World Bank / ILO.
            {' '}
            <a href={historicalData._source_url} target="_blank" rel="noopener noreferrer" className="text-[#0D9488] hover:underline">Lihat Sumber Data ↗</a>
          </p>
          <div className="h-[400px]">
            <LineChart
              data={unemploymentChartData}
              xKey="year"
              lines={lineChartLines}
              height={400}
            />
          </div>
        </CollapsibleSection>
      )}

      {historicalData && lfprChartData.length > 0 && (
        <CollapsibleSection title="Tren Partisipasi Angkatan Kerja (TPAK) ASEAN (2018 - 2025)" defaultOpen={false}>
          <p className="text-sm text-gray-500 mb-4">
            Perkembangan Tingkat Partisipasi Angkatan Kerja (Labor Force Participation Rate) berdasarkan data World Bank / ILO.
            {' '}
            <a href={historicalData._source_url} target="_blank" rel="noopener noreferrer" className="text-[#0D9488] hover:underline">Lihat Sumber Data ↗</a>
          </p>
          <div className="h-[400px]">
            <LineChart
              data={lfprChartData}
              xKey="year"
              lines={lineChartLines}
              height={400}
            />
          </div>
        </CollapsibleSection>
      )}

      {/* Ranking Chart */}
      <CollapsibleSection title="Peringkat Tingkat Pengangguran Terkini">
        <p className="text-sm text-gray-500 mb-4">
          Perbandingan tingkat pengangguran terbuka antar negara ASEAN berdasarkan rilis data terbaru.
        </p>
        <BarChart
          data={barData}
          xKey="negara"
          bars={[
            { dataKey: 'Tingkat Pengangguran (%)', label: 'Pengangguran (%)', color: '#D1D5DB' },
          ]}
          layout="vertical"
          height={380}
          highlightKey="Indonesia"
          highlightColor="#0D9488"
        />
      </CollapsibleSection>

      {/* Sortable Data Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Tabel Data Referensi</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3">
                  <SortHeader field="country" label="Negara" />
                </th>
                <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">NSO</th>
                <th className="text-right py-3 px-3">
                  <div className="flex justify-end">
                    <SortHeader field="unemployment" label="Pengangguran (%)" />
                  </div>
                </th>
                <th className="text-right py-3 px-3">
                  <div className="flex justify-end">
                    <SortHeader field="lfpr" label="TPAK (%)" />
                  </div>
                </th>
                <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Periode</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Sumber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedData.map((country) => (
                <tr key={country.country_code} className="hover:bg-gray-50">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{country.flag_emoji}</span>
                      <span className="font-medium text-gray-900">{country.country_name_id}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-gray-500">{country.nso_name}</td>
                  <td className="py-3 px-3 text-right font-medium text-gray-900">
                    {country.indicators.unemployment_rate
                      ? formatPercent(country.indicators.unemployment_rate.value)
                      : '-'}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-700">
                    {country.indicators.lfpr ? formatPercent(country.indicators.lfpr.value) : '-'}
                  </td>
                  <td className="py-3 px-3 text-gray-500 text-xs">
                    {country.indicators.unemployment_rate?.period || '-'}
                  </td>
                  <td className="py-3 px-3">
                    {country.indicators.unemployment_rate?._source_url ? (
                      <a 
                        href={country.indicators.unemployment_rate._source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:opacity-80 transition-opacity"
                        title="Verifikasi Data"
                      >
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${
                          country.data_tier === 'official_nso'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {country.data_tier === 'official_nso' ? 'NSO' : 'Estimasi'}
                        </span>
                      </a>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${
                        country.data_tier === 'official_nso'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {country.data_tier === 'official_nso' ? 'NSO' : 'Estimasi'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
