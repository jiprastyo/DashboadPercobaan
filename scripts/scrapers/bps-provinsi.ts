/**
 * scripts/scrapers/bps-provinsi.ts — BPS Provincial Data Scraper
 * Fetches provincial TPT data from BPS Web API with Google Spreadsheet fallback.
 */

import path from 'path';
import { fetchWithRetry, log, writeJSON, DATA_DIR, ensureDir } from '../config';
import { PROVINCES } from '../../src/lib/constants';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/18CgljAOiP8j8_i4qsPVmiYhuWNEYwFgRskPRRLEl5GI/export?format=csv';

export interface BPSProvinsiItem {
  province_code: string;
  province_name: string;
  tpt_feb_25: number | null;
  tpt_feb_26: number | null;
  _last_updated: string;
}

export interface BPSProvinsiFile {
  source: 'official_api' | 'fallback_spreadsheet';
  data: BPSProvinsiItem[];
}

// Fallback Google Sheet scraper
async function scrapeSpreadsheetFallback(): Promise<BPSProvinsiItem[]> {
  log('bps-provinsi', `Downloading CSV from fallback spreadsheet: ${SHEET_CSV_URL}`);
  const res = await fetchWithRetry(SHEET_CSV_URL);
  const csv = await res.text();
  
  const lines = csv.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const results: BPSProvinsiItem[] = [];
  
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 5) continue;
    
    const provRaw = parts[0].trim();
    if (!provRaw || provRaw === '' || provRaw.toLowerCase().includes('tabel') || provRaw === 'TPT') continue;

    let code = '00';
    let name = provRaw;
    
    if (provRaw !== 'Total') {
      const match = provRaw.match(/^(\d{2})\s+(.+)$/);
      if (match) {
        code = match[1];
        name = match[2];
      } else {
        continue;
      }
    } else {
      name = 'Nasional';
    }
    
    const tpt25 = parseFloat(parts[1]);
    const tpt26 = parseFloat(parts[2]);
    
    results.push({
      province_code: code,
      province_name: name,
      tpt_feb_25: isNaN(tpt25) ? null : tpt25,
      tpt_feb_26: isNaN(tpt26) ? null : tpt26,
      _last_updated: new Date().toISOString()
    });
  }
  return results;
}

export async function scrapeBPSProvinsi() {
  const apiKey = process.env.BPS_API_KEY;
  const outDir = path.join(DATA_DIR, 'bps', 'provinsi');
  ensureDir(outDir);
  const outPath = path.join(outDir, 'tpt.json');

  if (apiKey) {
    log('bps-provinsi', 'BPS_API_KEY detected. Fetching from BPS Web API...');
    try {
      // Variable 543 is TPT Menurut Provinsi. Year IDs 125 (2025) and 126 (2026).
      const url = `https://webapi.bps.go.id/v1/api/list/model/data/domain/0000/var/543/th/125;126/key/${apiKey}`;
      const res = await fetchWithRetry(url);
      const json = await res.json() as any;

      if (json.status === 'OK' && json.datacontent) {
        const datacontent = json.datacontent;
        const results: BPSProvinsiItem[] = [];

        // 1. Process National (Total) row
        const natVervar = '9999';
        const natKey25 = `${natVervar}5430125189`; // Indonesia TPT Feb 2025
        const natKey26 = `${natVervar}5430126189`; // Indonesia TPT Feb 2026
        const natVal25 = parseFloat(datacontent[natKey25]);
        const natVal26 = parseFloat(datacontent[natKey26]);

        results.push({
          province_code: '00',
          province_name: 'Nasional',
          tpt_feb_25: isNaN(natVal25) ? null : natVal25,
          tpt_feb_26: isNaN(natVal26) ? null : natVal26,
          _last_updated: new Date().toISOString()
        });

        // 2. Process all provinces in constants
        for (const prov of PROVINCES) {
          const provVervar = `${prov.code}00`;
          const key25 = `${provVervar}5430125189`;
          const key26 = `${provVervar}5430126189`;

          const val25 = parseFloat(datacontent[key25]);
          const val26 = parseFloat(datacontent[key26]);

          results.push({
            province_code: prov.code,
            province_name: prov.name,
            tpt_feb_25: isNaN(val25) ? null : val25,
            tpt_feb_26: isNaN(val26) ? null : val26,
            _last_updated: new Date().toISOString()
          });
        }

        const payload: BPSProvinsiFile = {
          source: 'official_api',
          data: results
        };

        writeJSON(outPath, payload);
        log('bps-provinsi', `Successfully fetched and saved ${results.length} records from official BPS API.`);
        return { source: 'official_api', count: results.length };
      } else {
        log('bps-provinsi', `BPS API status not OK or datacontent missing: ${JSON.stringify(json).slice(0, 300)}`);
      }
    } catch (err) {
      log('bps-provinsi', `Error querying official BPS API: ${err}. Falling back to spreadsheet...`);
    }
  } else {
    log('bps-provinsi', 'No BPS_API_KEY set. Using spreadsheet fallback...');
  }

  // Fallback execution
  try {
    const fallbackData = await scrapeSpreadsheetFallback();
    const payload: BPSProvinsiFile = {
      source: 'fallback_spreadsheet',
      data: fallbackData
    };
    writeJSON(outPath, payload);
    log('bps-provinsi', `Saved ${fallbackData.length} provincial records using spreadsheet fallback.`);
    return { source: 'fallback_spreadsheet', count: fallbackData.length };
  } catch (err) {
    log('bps-provinsi', `Fatal error on fallback: ${err}`);
    throw err;
  }
}

// Run directly
if (require.main === module) {
  scrapeBPSProvinsi()
    .then((result) => {
      log('bps-provinsi', `Done. ${JSON.stringify(result)}`);
    })
    .catch((err) => {
      log('bps-provinsi', `Fatal error: ${err}`);
      process.exit(1);
    });
}
