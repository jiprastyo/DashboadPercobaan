'use client';

import { useState, useMemo } from 'react';
import { getSampleASEANData } from '@/lib/data-loader';
import { formatPercent } from '@/lib/utils';
import CountryCard from '@/components/cards/CountryCard';
import BarChart from '@/components/charts/BarChart';
import { ArrowUpDown } from 'lucide-react';

type SortField = 'country' | 'unemployment' | 'lfpr';
type SortDir = 'asc' | 'desc';

export default function MakroASEANPage() {
  const aseanData = getSampleASEANData();
  const [sortField, setSortField] = useState<SortField>('unemployment');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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
          {aseanData.map((country) => (
            <CountryCard
              key={country.country_code}
              flagEmoji={country.flag_emoji}
              countryName={country.country_name_id}
              nsoName={country.nso_name}
              nsoUrl={country.nso_url}
              unemploymentRate={country.indicators.unemployment_rate?.value}
              unemploymentPeriod={country.indicators.unemployment_rate?.period}
              lfpr={country.indicators.lfpr?.value}
              dataTier={country.data_tier}
              lastUpdated={country.last_updated}
              sourceUrl={country.indicators.unemployment_rate?._source_url}
            />
          ))}
        </div>
      </div>

      {/* Ranking Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Peringkat Tingkat Pengangguran
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Perbandingan tingkat pengangguran terbuka antar negara ASEAN.
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
      </div>

      {/* Sortable Data Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Tabel Data</h2>
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
