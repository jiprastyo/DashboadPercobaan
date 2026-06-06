/**
 * scripts/scrapers/bps-provinsi.ts — BPS Provincial Data Scraper
 * Downloads provincial TPT data from the Google Spreadsheet linked in the PDF.
 */

import path from 'path';
import { fetchWithRetry, log, writeJSON, DATA_DIR, ensureDir } from '../config';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/18CgljAOiP8j8_i4qsPVmiYhuWNEYwFgRskPRRLEl5GI/export?format=csv';

export interface BPSProvinsiData {
  province_code: string;
  province_name: string;
  tpt_feb_25: number | null;
  tpt_feb_26: number | null;
  _last_updated: string;
}

export async function scrapeBPSProvinsi() {
  log('bps-provinsi', `Downloading CSV from ${SHEET_CSV_URL}`);
  
  try {
    const res = await fetchWithRetry(SHEET_CSV_URL);
    const csv = await res.text();
    
    const lines = csv.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const results: BPSProvinsiData[] = [];
    
    // Process from line 4 (where data starts, 'Total' is at index 4 usually based on previous inspection)
    // Actually, we'll just scan all lines for matching pattern (start with numbers or 'Total')
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 5) continue;
      
      const provRaw = parts[0].trim();
      
      // Skip empty or header rows
      if (!provRaw || provRaw === '' || provRaw.toLowerCase().includes('tabel') || provRaw === 'TPT') continue;

      let code = '00';
      let name = provRaw;
      
      if (provRaw !== 'Total') {
        const match = provRaw.match(/^(\d{2})\s+(.+)$/);
        if (match) {
          code = match[1];
          name = match[2];
        } else {
          continue; // Not a province line
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
    
    const outDir = path.join(DATA_DIR, 'bps', 'provinsi');
    ensureDir(outDir);
    const outPath = path.join(outDir, 'tpt.json');
    
    writeJSON(outPath, results);
    log('bps-provinsi', `Saved ${results.length} provincial records.`);
    
    return { count: results.length };
  } catch (err) {
    log('bps-provinsi', `Error scraping BPS Provinsi: ${err}`);
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
