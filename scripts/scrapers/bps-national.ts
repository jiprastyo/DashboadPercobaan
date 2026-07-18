/**
 * scripts/scrapers/bps-national.ts — BPS National Indicators Scraper
 * Fetches national Inflation, IHK, Exports, and Imports from BPS Web API with static seed fallback.
 */

import path from 'path';
import { fetchWithRetry, log, writeJSON, DATA_DIR, ensureDir } from '../config';

export interface BPSNationalItem {
  id: string;
  indicator: 'ihk' | 'ekspor' | 'impor';
  period: string; // e.g. "Februari 2026"
  value: number;
  change_mom?: number;
  change_yoy?: number;
}

export interface BPSNationalFile {
  source: 'official_api' | 'static_seed';
  data: BPSNationalItem[];
}

const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const YEAR_IDS = {
  '2024': '124',
  '2025': '125',
  '2026': '126'
};

// Static seed fallback data (compiled from typical Indonesian historical stats)
const STATIC_SEED_DATA: BPSNationalItem[] = [
  // Feb 2026
  { id: 'ihk-2026-02', indicator: 'ihk', period: 'Februari 2026', value: 105.8, change_mom: 0.2, change_yoy: 3.2 },
  { id: 'ekspor-2026-02', indicator: 'ekspor', period: 'Februari 2026', value: 19310000000, change_yoy: -9.45 },
  { id: 'impor-2026-02', indicator: 'impor', period: 'Februari 2026', value: 18440000000, change_yoy: -0.29 },
  // Jan 2026
  { id: 'ihk-2026-01', indicator: 'ihk', period: 'Januari 2026', value: 105.6, change_mom: 0.15, change_yoy: 3.1 },
  { id: 'ekspor-2026-01', indicator: 'ekspor', period: 'Januari 2026', value: 20520000000, change_yoy: -8.34 },
  { id: 'impor-2026-01', indicator: 'impor', period: 'Januari 2026', value: 18510000000, change_yoy: -3.13 },
  // Dec 2025
  { id: 'ihk-2025-12', indicator: 'ihk', period: 'Desember 2025', value: 105.45, change_mom: 0.25, change_yoy: 3.0 },
  { id: 'ekspor-2025-12', indicator: 'ekspor', period: 'Desember 2025', value: 22410000000, change_yoy: 1.89 },
  { id: 'impor-2025-12', indicator: 'impor', period: 'Desember 2025', value: 19110000000, change_yoy: -2.45 },
  // Nov 2025
  { id: 'ihk-2025-11', indicator: 'ihk', period: 'November 2025', value: 105.2, change_mom: 0.18, change_yoy: 2.9 },
  { id: 'ekspor-2025-11', indicator: 'ekspor', period: 'November 2025', value: 24010000000, change_yoy: 9.14 },
  { id: 'impor-2025-11', indicator: 'impor', period: 'November 2025', value: 19590000000, change_yoy: 3.5 },
  // Oct 2025
  { id: 'ihk-2025-10', indicator: 'ihk', period: 'Oktober 2025', value: 105.02, change_mom: 0.11, change_yoy: 2.8 },
  { id: 'ekspor-2025-10', indicator: 'ekspor', period: 'Oktober 2025', value: 24410000000, change_yoy: 10.25 },
  { id: 'impor-2025-10', indicator: 'impor', period: 'Oktober 2025', value: 21940000000, change_yoy: 16.54 },
  // Sep 2025
  { id: 'ihk-2025-09', indicator: 'ihk', period: 'September 2025', value: 104.91, change_mom: -0.12, change_yoy: 2.7 },
  { id: 'ekspor-2025-09', indicator: 'ekspor', period: 'September 2025', value: 22080000000, change_yoy: 6.44 },
  { id: 'impor-2025-09', indicator: 'impor', period: 'September 2025', value: 18820000000, change_yoy: -8.91 }
];

export async function scrapeBPSNational() {
  const apiKey = process.env.BPS_API_KEY;
  const outDir = path.join(DATA_DIR, 'bps');
  ensureDir(outDir);
  const outPath = path.join(outDir, 'national-indicators.json');

  if (apiKey) {
    log('bps-national', 'BPS_API_KEY detected. Fetching official indicators from API...');
    try {
      // 1. Fetch Inflasi Bulanan (M-to-M) (var 1)
      const inflasiUrl = `https://webapi.bps.go.id/v1/api/list/model/data/domain/0000/var/1/th/124;125;126/key/${apiKey}`;
      const inflasiRes = await fetchWithRetry(inflasiUrl);
      const inflasiJson = await inflasiRes.json() as any;

      // 2. Fetch IHK 150 Kabupaten/Kota (2022=100) (var 2245)
      const ihkUrl = `https://webapi.bps.go.id/v1/api/list/model/data/domain/0000/var/2245/th/124;125;126/key/${apiKey}`;
      const ihkRes = await fetchWithRetry(ihkUrl);
      const ihkJson = await ihkRes.json() as any;

      // 3. Fetch Nilai Ekspor (var 196)
      const eksporUrl = `https://webapi.bps.go.id/v1/api/list/model/data/domain/0000/var/196/th/124;125;126/key/${apiKey}`;
      const eksporRes = await fetchWithRetry(eksporUrl);
      const eksporJson = await eksporRes.json() as any;

      // 4. Fetch Nilai Impor (var 497)
      const imporUrl = `https://webapi.bps.go.id/v1/api/list/model/data/domain/0000/var/497/th/124;125;126/key/${apiKey}`;
      const imporRes = await fetchWithRetry(imporUrl);
      const imporJson = await imporRes.json() as any;

      if (
        inflasiJson.status === 'OK' &&
        ihkJson.status === 'OK' &&
        eksporJson.status === 'OK' &&
        imporJson.status === 'OK'
      ) {
        const inflasiData = inflasiJson.datacontent || {};
        const ihkData = ihkJson.datacontent || {};
        const eksporData = eksporJson.datacontent || {};
        const imporData = imporJson.datacontent || {};

        const results: BPSNationalItem[] = [];

        // Helper to query values from API datacontent object
        const getVal = (dataObj: any, key: string): number | null => {
          const raw = dataObj[key];
          if (raw === undefined || raw === null) return null;
          const val = parseFloat(raw);
          return isNaN(val) ? null : val;
        };

        // We will loop from 2024 to 2026, months 1 to 12
        const years = ['2024', '2025', '2026'];
        
        // Temporarily store records in a structured way to calculate YoY changes
        const tempStore: Record<string, {
          ihk: number | null;
          inflasiMom: number | null;
          ekspor: number | null;
          impor: number | null;
        }> = {};

        for (const year of years) {
          const thId = YEAR_IDS[year as keyof typeof YEAR_IDS];
          for (let m = 1; m <= 12; m++) {
            const tempKey = `${year}-${String(m).padStart(2, '0')}`;
            
            // Keys mapping: vervar + var + turvar + tahun + turtahun
            // Inflasi (var 1): Indonesia = 9999
            const keyInflasi = `999910${thId}${m}`;
            // IHK (var 2245): Indonesia = 151
            const keyIhk = `15122450${thId}${m}`;
            // Ekspor (var 196): Indonesia = 9999
            const keyEkspor = `99991960${thId}${m}`;
            // Impor (var 497): Indonesia = 9999
            const keyImpor = `99994970${thId}${m}`;

            const ihkVal = getVal(ihkData, keyIhk);
            const inflasiMomVal = getVal(inflasiData, keyInflasi);
            const eksporVal = getVal(eksporData, keyEkspor);
            const imporVal = getVal(imporData, keyImpor);

            // Only store if we have at least one valid data point
            if (ihkVal !== null || inflasiMomVal !== null || eksporVal !== null || imporVal !== null) {
              tempStore[tempKey] = {
                ihk: ihkVal,
                inflasiMom: inflasiMomVal,
                ekspor: eksporVal,
                impor: imporVal
              };
            }
          }
        }

        // Build list of records sorted latest first (2026 -> 2024)
        const sortedKeys = Object.keys(tempStore).sort().reverse();

        for (const tempKey of sortedKeys) {
          const [yearStr, monthStr] = tempKey.split('-');
          const year = parseInt(yearStr);
          const monthIndex = parseInt(monthStr);
          const period = `${INDO_MONTHS[monthIndex - 1]} ${year}`;
          const current = tempStore[tempKey];

          // 1. Calculate YoY changes by checking same month in previous year
          const prevYearKey = `${year - 1}-${String(monthIndex).padStart(2, '0')}`;
          const previous = tempStore[prevYearKey];

          // IHK record
          if (current.ihk !== null) {
            let changeYoy: number | undefined = undefined;
            if (previous && previous.ihk) {
              changeYoy = parseFloat((((current.ihk - previous.ihk) / previous.ihk) * 100).toFixed(2));
            }

            results.push({
              id: `ihk-${year}-${monthStr}`,
              indicator: 'ihk',
              period,
              value: current.ihk,
              change_mom: current.inflasiMom !== null ? current.inflasiMom : undefined,
              change_yoy: changeYoy
            });
          }

          // Ekspor record
          if (current.ekspor !== null) {
            let changeYoy: number | undefined = undefined;
            if (previous && previous.ekspor) {
              changeYoy = parseFloat((((current.ekspor - previous.ekspor) / previous.ekspor) * 100).toFixed(2));
            }
            // Value is in Million USD in BPS, convert to raw USD for the client (multiply by 1e6)
            const valInUsd = parseFloat((current.ekspor * 1e6).toFixed(0));

            results.push({
              id: `ekspor-${year}-${monthStr}`,
              indicator: 'ekspor',
              period,
              value: valInUsd,
              change_yoy: changeYoy
            });
          }

          // Impor record
          if (current.impor !== null) {
            let changeYoy: number | undefined = undefined;
            if (previous && previous.impor) {
              changeYoy = parseFloat((((current.impor - previous.impor) / previous.impor) * 100).toFixed(2));
            }
            // Value is in Million USD in BPS, convert to raw USD for the client (multiply by 1e6)
            const valInUsd = parseFloat((current.impor * 1e6).toFixed(0));

            results.push({
              id: `impor-${year}-${monthStr}`,
              indicator: 'impor',
              period,
              value: valInUsd,
              change_yoy: changeYoy
            });
          }
        }

        if (results.length > 0) {
          const payload: BPSNationalFile = {
            source: 'official_api',
            data: results
          };
          writeJSON(outPath, payload);
          log('bps-national', `Successfully fetched and compiled ${results.length} national indicator records.`);
          return { source: 'official_api', count: results.length };
        }
      } else {
        log('bps-national', 'BPS API response status not OK for some variables.');
      }
    } catch (err) {
      log('bps-national', `Error scraping BPS National API: ${err}. Falling back to static seed...`);
    }
  } else {
    log('bps-national', 'No BPS_API_KEY environment variable. Using static seed...');
  }

  // Fallback
  const payload: BPSNationalFile = {
    source: 'static_seed',
    data: STATIC_SEED_DATA
  };
  writeJSON(outPath, payload);
  log('bps-national', `Saved ${STATIC_SEED_DATA.length} national indicator records from static seed.`);
  return { source: 'static_seed', count: STATIC_SEED_DATA.length };
}

// Run directly
if (require.main === module) {
  scrapeBPSNational()
    .then((result) => {
      log('bps-national', `Done. ${JSON.stringify(result)}`);
    })
    .catch((err) => {
      log('bps-national', `Fatal error: ${err}`);
      process.exit(1);
    });
}
