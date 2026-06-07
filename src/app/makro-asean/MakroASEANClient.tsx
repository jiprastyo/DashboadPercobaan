'use client';

import { useMemo } from 'react';
import { ASEANCountryData } from '@/types';
import { ASEANHistoricalData } from '@/lib/data-loader-server';
import { formatPercent } from '@/lib/utils';
import { ASEAN_COUNTRIES } from '@/lib/constants';

interface MakroASEANClientProps {
  aseanData: ASEANCountryData[];
  historicalData: ASEANHistoricalData | null;
}

export default function MakroASEANClient({ aseanData, historicalData }: MakroASEANClientProps) {
  // Aggregate data by year
  const yearlyData = useMemo(() => {
    if (!historicalData) return [];
    
    // We want a structure like:
    // [ { year: '2025', countries: [ { name: 'Indonesia', uem: 4.8, lfpr: 69, emp: 65 }, ... ] }, ... ]
    
    const yearMap = new Map<string, any[]>();
    
    // Determine all years available across all countries and indicators
    const allYears = new Set<string>();
    historicalData.countries.forEach(country => {
      Object.values(country.indicators).forEach(ind => {
        ind.values.forEach(v => {
          if (v.year) allYears.add(v.year);
        });
      });
    });
    
    const sortedYears = Array.from(allYears).sort((a, b) => b.localeCompare(a)); // Descending
    
    sortedYears.forEach(year => {
      const countryStats = historicalData.countries.map(country => {
        const uem = country.indicators['SL.UEM.TOTL.ZS']?.values.find(v => v.year === year)?.value;
        const lfpr = country.indicators['SL.TLF.CACT.ZS']?.values.find(v => v.year === year)?.value;
        const emp = country.indicators['SL.EMP.TOTL.SP.ZS']?.values.find(v => v.year === year)?.value;
        
        // Find flag from constants
        const cInfo = ASEAN_COUNTRIES.find(c => c.country_name_en === country.countryName || c.country_name_id === country.countryName);
        
        return {
          countryName: cInfo?.country_name_id || country.countryName,
          flagEmoji: cInfo?.flag_emoji || '🏳️',
          uem,
          lfpr,
          emp
        };
      });
      
      yearMap.set(year, countryStats);
    });
    
    return Array.from(yearMap.entries()).map(([year, countries]) => ({ year, countries }));
  }, [historicalData]);

  if (!historicalData || yearlyData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5 text-center text-gray-500">
        Data historis ASEAN tidak tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Data Makro ASEAN (World Bank / ILO)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Tabel data historis per tahun untuk evaluasi kelengkapan data. 
          Indikator: Pengangguran Terbuka (TPT), Tingkat Partisipasi Angkatan Kerja (TPAK), dan Rasio Pekerja terhadap Populasi (Employment Ratio).
        </p>
        <a href={historicalData._source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0D9488] hover:underline">
          Akses Sumber Data Asli ↗
        </a>
      </div>

      {yearlyData.map(({ year, countries }) => (
        <div key={year} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Tahun {year}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-5 font-medium text-gray-500 uppercase">Negara</th>
                  <th className="text-right py-3 px-5 font-medium text-gray-500 uppercase">Pengangguran (%)</th>
                  <th className="text-right py-3 px-5 font-medium text-gray-500 uppercase">TPAK (%)</th>
                  <th className="text-right py-3 px-5 font-medium text-gray-500 uppercase">Employment Ratio (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {countries.map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{c.flagEmoji}</span>
                        <span className="font-medium text-gray-900">{c.countryName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-right font-medium text-gray-900">
                      {c.uem !== undefined && c.uem !== null ? formatPercent(c.uem) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-3 px-5 text-right text-gray-700">
                      {c.lfpr !== undefined && c.lfpr !== null ? formatPercent(c.lfpr) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-3 px-5 text-right text-gray-700">
                      {c.emp !== undefined && c.emp !== null ? formatPercent(c.emp) : <span className="text-gray-300">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
