/**
 * scripts/scrapers/bps-national.ts — BPS National Indicators Scraper
 * Fetches national Inflation, IHK, Exports, Imports and Wisman (foreign
 * tourists) from the official BPS Web API.
 *
 * Outputs (all written only when the official API succeeds):
 *  - data/bps/national-indicators.json      (2024 -> present, headline series)
 *  - data/bps/historical-ihk-trade.json     (2016 -> present, chart history)
 *  - data/bps/wisman.json                   (2016 -> present, monthly visits)
 *
 * Historical files are NEVER overwritten by fallbacks: if the API fails or
 * BPS_API_KEY is missing, the scraper leaves the existing files untouched and
 * national-indicators.json falls back to the static seed (as before).
 *
 * Verified API facts (probed live 2026-09-15):
 *  - var 1     Inflasi Bulanan MtM (%)      vervar 9999 = Indonesia
 *  - var 2     IHK Umum (2012=100)          vervar 9999, data until 2023 only
 *  - var 2245  IHK 150 Kab/Kota (2022=100)  vervar 151 = Indonesia, from 2024
 *  - var 196   Nilai Ekspor (Juta US$)      vervar 9999, monthly 2016 -> now
 *  - var 497   Nilai Impor  (Juta US$)      vervar 9999, monthly 2016 -> now
 *  - var 1150  Kunjungan Wisman (Kunjungan) vervar 36 = Total; month 13 = annual
 *  - datacontent key: `${vervar}${var}0${tahunId}${bulan}`  (tahunId = 100+YY)
 */

import path from 'path';
import { fetchWithRetry, log, writeJSON, readJSON, DATA_DIR, ensureDir } from '../config';

export interface BPSNationalItem {
  id: string;
  indicator: 'ihk' | 'ekspor' | 'impor' | 'wisman';
  period: string; // e.g. "Februari 2026" (long) or "Feb 2026" (wisman/trade history)
  value: number;
  change_mom?: number;
  change_yoy?: number;
}

export interface BPSNationalFile {
  source: 'official_api' | 'static_seed' | 'historical_seed';
  _source_url?: string;
  data: BPSNationalItem[];
}

const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const HISTORY_START_YEAR = 2016;
const HEADLINE_START_YEAR = 2024;

const yearId = (year: number) => String(100 + (year % 100)); // 2016 -> "116"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch datacontent map for one variable over an inclusive year range.
 *  BPS caps the `th` selector at 3 years per call, so we chunk and merge. */
async function fetchVarData(
  apiKey: string,
  varId: number,
  fromYear: number,
  toYear: number,
  onFail?: () => void
): Promise<Record<string, number> | null> {
  const vervarSeg = varId === 1150 ? '/vervar/36' : '';
  const merged: Record<string, number> = {};
  let anyOk = false;
  for (let start = fromYear; start <= toYear; start += 3) {
    const end = Math.min(start + 2, toYear);
    const ths: string[] = [];
    for (let y = start; y <= end; y++) ths.push(yearId(y));
    const url =
      `https://webapi.bps.go.id/v1/api/list/model/data/domain/0000/var/${varId}` +
      `/th/${ths.join(';')}${vervarSeg}/key/${apiKey}`;
    // BPS rate-limits hard: "not Allowed" comes back as HTTP 200 + status Error,
    // sustained bursts escalate to a WAF 403 HTML page. Either way, retrying
    // immediately extends the block, so pace >=7s between calls and give a
    // single long (3 min) cooldown before the second attempt.
    let json: { status?: string; message?: string; 'data-availability'?: string; datacontent?: Record<string, number> } | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      await sleep(attempt === 0 ? 7500 : 180000);
      const res = await fetchWithRetry(url);
      const txt = await res.text();
      try {
        json = JSON.parse(txt) as typeof json;
      } catch {
        json = { status: 'Error', message: `non-JSON response (HTTP ${res.status}, likely WAF)` };
      }
      if (json?.status === 'OK') break;
    }
    if (json?.status !== 'OK' || json?.['data-availability'] !== 'available') {
      log('bps-national', `var ${varId} th ${start}-${end}: status=${json?.status} msg=${String(json?.message || '').slice(0, 120)}`);
      if (json?.status !== 'OK') onFail?.(); // throttled/WAF, not an empty-but-valid range
      continue;
    }
    anyOk = true;
    Object.assign(merged, json.datacontent || {});
  }
  return anyOk ? merged : null;
}

const numAt = (
  data: Record<string, number> | null,
  vervar: string,
  varId: number,
  year: number,
  month: number
): number | null => {
  if (!data) return null;
  const key = `${vervar}${varId}0${yearId(year)}${month}`;
  const raw = (data as Record<string, unknown>)[key];
  if (raw === undefined || raw === null || raw === '') return null;
  const v = typeof raw === 'string' ? parseFloat(raw.replace(/,/g, '.')) : Number(raw);
  return Number.isFinite(v) ? v : null;
};

const round2 = (v: number) => parseFloat(v.toFixed(2));

function pctChange(cur: number | null, prev: number | null): number | undefined {
  if (cur === null || prev === null || prev === 0) return undefined;
  return round2(((cur - prev) / prev) * 100);
}

function latestYear(): number {
  return new Date().getFullYear();
}

/**
 * Build 2016 -> now rows for IHK/ekspor/impor from official API data.
 * IHK index uses the 2022=100 series from 2024; earlier months are chained
 * from the 2012=100 series via the Dec-2023/Jan-2024 overlap factor so the
 * line stays continuous (standard CPI chain rebasing).
 */
function buildHistoricalTrade(
  ihk2245: Record<string, number> | null,
  ihk2: Record<string, number> | null,
  inflasi1: Record<string, number> | null,
  ekspor196: Record<string, number> | null,
  impor497: Record<string, number> | null,
  endYear: number
): BPSNationalItem[] {
  const rows: BPSNationalItem[] = [];

  // Chain factor: bring 2012-base IHK onto the 2022-base level.
  const dec2012 = numAt(ihk2, '9999', 2, 2023, 12);
  const jan2022 = numAt(ihk2245, '151', 2245, 2024, 1);
  const chainFactor = dec2012 && jan2022 ? jan2022 / dec2012 : null;

  for (let year = HEADLINE_START_YEAR; year <= endYear; year++) {
    for (let m = 12; m >= 1; m--) {
      const v = numAt(ihk2245, '151', 2245, year, m);
      if (v === null) continue;
      rows.push({
        id: `ihk-${year}-${String(m).padStart(2, '0')}`,
        indicator: 'ihk',
        period: `${INDO_MONTHS[m - 1]} ${year}`,
        value: v,
        change_mom: numAt(inflasi1, '9999', 1, year, m) ?? undefined,
        change_yoy: pctChange(v, numAt(ihk2245, '151', 2245, year - 1, m)),
      });
    }
  }
  if (chainFactor !== null) {
    for (let year = endYear; year >= HISTORY_START_YEAR; year--) {
      if (year >= HEADLINE_START_YEAR) continue;
      for (let m = 12; m >= 1; m--) {
        const v12 = numAt(ihk2, '9999', 2, year, m);
        if (v12 === null) continue;
        const prevMonth = m > 1 ? numAt(ihk2, '9999', 2, year, m - 1) : numAt(ihk2, '9999', 2, year - 1, 12);
        rows.push({
          id: `ihk-${year}-${String(m).padStart(2, '0')}`,
          indicator: 'ihk',
          period: `${MONTHS_SHORT[m - 1]} ${year}`,
          value: round2(v12 * chainFactor * 100) / 100,
          // Prefer the official MtM inflation series when the fetch covered
          // this month; else derive from the index ratio (base-invariant).
          change_mom:
            numAt(inflasi1, '9999', 1, year, m) ??
            (prevMonth ? pctChange(v12, prevMonth) : undefined),
        });
      }
    }
  }

  for (const [indicator, data] of [
    ['ekspor', ekspor196],
    ['impor', impor497],
  ] as const) {
    for (let year = endYear; year >= HISTORY_START_YEAR; year--) {
      for (let m = 12; m >= 1; m--) {
        const jutaUsd = numAt(data, '9999', indicator === 'ekspor' ? 196 : 497, year, m);
        if (jutaUsd === null) continue;
        const valInUsd = parseFloat((jutaUsd * 1e6).toFixed(0));
        const prevJuta = numAt(data, '9999', indicator === 'ekspor' ? 196 : 497, year - 1, m);
        rows.push({
          id: `${indicator}-${year}-${String(m).padStart(2, '0')}`,
          indicator,
          period: `${MONTHS_SHORT[m - 1]} ${year}`,
          value: valInUsd,
          change_yoy: pctChange(jutaUsd, prevJuta),
        });
      }
    }
  }
  return rows;
}

/** Wisman monthly arrivals with YoY vs same month last year. */
function buildWisman(
  wis1150: Record<string, number> | null,
  endYear: number
): BPSNationalItem[] {
  const rows: BPSNationalItem[] = [];
  for (let year = endYear; year >= HISTORY_START_YEAR; year--) {
    for (let m = 12; m >= 1; m--) {
      const v = numAt(wis1150, '36', 1150, year, m);
      if (v === null) continue;
      rows.push({
        id: `wisman-${year}-${String(m).padStart(2, '0')}`,
        indicator: 'wisman',
        period: `${MONTHS_SHORT[m - 1]} ${year}`,
        value: v,
        change_yoy: pctChange(v, numAt(wis1150, '36', 1150, year - 1, m)) ?? 0,
      });
    }
  }
  return rows;
}

export async function scrapeBPSNational() {
  const apiKey = process.env.BPS_API_KEY;
  const outDir = path.join(DATA_DIR, 'bps');
  ensureDir(outDir);
  const outPath = path.join(outDir, 'national-indicators.json');
  const histPath = path.join(outDir, 'historical-ihk-trade.json');
  const wismanOut = path.join(outDir, 'wisman.json');
  const endYear = latestYear();

  if (!apiKey) {
    log('bps-national', 'No BPS_API_KEY environment variable.');
    const existing = readJSON<BPSNationalFile>(outPath);
    if (existing && existing.source === 'official_api' && existing.data.length > 0) {
      log('bps-national', 'Keeping last good official_api file; historical files untouched.');
      return { source: 'keep_last_good', count: existing.data.length, historical: 'skipped' };
    }
    const payload: BPSNationalFile = { source: 'static_seed', data: STATIC_SEED_DATA };
    writeJSON(outPath, payload);
    return { source: 'static_seed', count: payload.data.length, historical: 'skipped' };
  }

  // Incremental mode: full 2016->now backfill only while a file still holds
  // the frozen seed; once official_api data exists we top up the last 3
  // years (merged in below, older rows preserved). Keeps weekly CI under
  // ~10 API calls so BPS rate limits stay comfortable.
  const existingHist = readJSON<BPSNationalFile>(histPath);
  const existingWis = readJSON<BPSNationalFile>(wismanOut);
  const needHistBackfill =
    !existingHist || existingHist.source !== 'official_api' || process.env.BPS_FULL_BACKFILL === '1';
  const needWisBackfill =
    !existingWis || existingWis.source !== 'official_api' || process.env.BPS_FULL_BACKFILL === '1';
  const histFrom = needHistBackfill ? HISTORY_START_YEAR : endYear - 4; // +1yr lookback for YoY
  const wisFrom = needWisBackfill ? HISTORY_START_YEAR : endYear - 4;

  // Merge fresh API rows over existing rows; keep an existing change_yoy /
  // change_mom when the fresh row cannot compute it (window edge).
  const mergeRows = (
    existing: BPSNationalFile | null,
    fresh: BPSNationalItem[]
  ): BPSNationalItem[] => {
    const byId = new Map<string, BPSNationalItem>();
    if (existing) for (const r of existing.data) byId.set(r.id, r);
    for (const r of fresh) {
      const old = byId.get(r.id);
      if (old) {
        if (r.change_yoy === undefined && old.change_yoy !== undefined) r.change_yoy = old.change_yoy;
        if (r.change_mom === undefined && old.change_mom !== undefined) r.change_mom = old.change_mom;
      }
      byId.set(r.id, r);
    }
    return Array.from(byId.values()).sort((a, b) => b.id.localeCompare(a.id));
  };

  log('bps-national', `Fetching indicators (headline ${HEADLINE_START_YEAR}..${endYear}, history from ${histFrom}, wisman from ${wisFrom}) ...`);
  try {
    // Sequential + paced: BPS throttles bursts hard (see fetchVarData).
    let failedChunks = 0;
    const fetchPaced = async (varId: number, from: number, to: number) => {
      const r = await fetchVarData(apiKey, varId, from, to, () => failedChunks++);
      if (failedChunks >= 4) throw new Error('BPS API consistently refusing requests (WAF/rate block); aborting run');
      return r;
    };

    // var 1 (monthly inflation): backfill pulls the real series from 2016;
    // routine top-up only needs the headline window. Pre-2024 rows fall back
    // to the index-ratio derivation when the API value is missing.
    const inflasi1 = await fetchPaced(
      1,
      needHistBackfill ? HISTORY_START_YEAR : HEADLINE_START_YEAR,
      endYear
    );
    const ihk2245 = await fetchPaced(2245, HEADLINE_START_YEAR, endYear);
    const ihk2 = needHistBackfill
      ? await fetchPaced(2, HISTORY_START_YEAR, 2023)
      : null;
    const ekspor196 = await fetchPaced(196, histFrom, endYear);
    const impor497 = await fetchPaced(497, histFrom, endYear);
    const wisman1150 = await fetchPaced(1150, wisFrom, endYear);
    if (!ihk2245 && !ekspor196 && !wisman1150) {
      throw new Error('BPS API returned no data for any variable (key throttled or invalid)');
    }

    // ── Headline file: national-indicators.json (2024 -> now) ──────────────
    const results: BPSNationalItem[] = [];
    for (let year = endYear; year >= HEADLINE_START_YEAR; year--) {
      for (let m = 12; m >= 1; m--) {
        const mk = String(m).padStart(2, '0');
        const ihkV = numAt(ihk2245, '151', 2245, year, m);
        if (ihkV !== null) {
          const rec: BPSNationalItem = {
            id: `ihk-${year}-${mk}`,
            indicator: 'ihk',
            period: `${INDO_MONTHS[m - 1]} ${year}`,
            value: ihkV,
            change_mom: numAt(inflasi1, '9999', 1, year, m) ?? undefined,
            change_yoy: pctChange(ihkV, numAt(ihk2245, '151', 2245, year - 1, m)),
          };
          results.push(rec);
        }
        const ex = numAt(ekspor196, '9999', 196, year, m);
        if (ex !== null) {
          results.push({
            id: `ekspor-${year}-${mk}`,
            indicator: 'ekspor',
            period: `${INDO_MONTHS[m - 1]} ${year}`,
            value: parseFloat((ex * 1e6).toFixed(0)),
            change_yoy: pctChange(ex, numAt(ekspor196, '9999', 196, year - 1, m)),
          });
        }
        const im = numAt(impor497, '9999', 497, year, m);
        if (im !== null) {
          results.push({
            id: `impor-${year}-${mk}`,
            indicator: 'impor',
            period: `${INDO_MONTHS[m - 1]} ${year}`,
            value: parseFloat((im * 1e6).toFixed(0)),
            change_yoy: pctChange(im, numAt(impor497, '9999', 497, year - 1, m)),
          });
        }
      }
    }

    if (results.length > 0) {
      writeJSON(outPath, { source: 'official_api', data: results } as BPSNationalFile);
      log('bps-national', `Saved ${results.length} national indicator records.`);
    } else {
      log('bps-national', 'API returned no headline records; leaving national-indicators.json untouched.');
    }

    // ── Historical file: merge fresh rows over existing (seed or API) ─────
    const hist = buildHistoricalTrade(ihk2245, ihk2, inflasi1, ekspor196, impor497, endYear);
    const histIhk = hist.filter((r) => r.indicator === 'ihk').length;
    if (histIhk > 0 && hist.some((r) => r.indicator === 'ekspor')) {
      // Backfill mode: replace entirely (drops the synthetic seed rows).
      // Incremental mode: merge so pre-window history is preserved.
      const mergedHist = needHistBackfill ? hist : mergeRows(existingHist, hist);
      writeJSON(histPath, {
        source: 'official_api',
        _source_url: 'https://webapi.bps.go.id/ (var 1, 2, 196, 497, 2245)',
        data: mergedHist,
      } as BPSNationalFile);
      log('bps-national', `Saved ${mergedHist.length} historical IHK/trade records (${hist.length} fresh).`);
    } else {
      log('bps-national', 'Insufficient API coverage for historical IHK/trade; leaving file untouched.');
    }

    // ── Wisman series ──────────────────────────────────────────────────────
    const wis = buildWisman(wisman1150, endYear);
    if (wis.length > 0) {
      const mergedWis = needWisBackfill ? wis : mergeRows(existingWis, wis);
      writeJSON(wismanOut, {
        source: 'official_api',
        _source_url: 'https://webapi.bps.go.id/ (var 1150, Total kunjungan)',
        data: mergedWis,
      });
      log('bps-national', `Saved ${mergedWis.length} wisman monthly records (${wis.length} fresh).`);
    } else {
      log('bps-national', 'No wisman data returned; leaving wisman.json untouched.');
    }

    return {
      source: 'official_api',
      count: results.length,
      historical: hist.length,
      wisman: wis.length,
    };
  } catch (err) {
    log('bps-national', `Error scraping BPS National API: ${err}. Falling back to static seed...`);
    const existing = readJSON<BPSNationalFile>(outPath);
    if (existing && existing.source === 'official_api' && existing.data.length > 0) {
      log('bps-national', 'Keeping last good official_api file; not overwriting with seed.');
      return { source: 'keep_last_good', count: existing.data.length };
    }
    const payload: BPSNationalFile = { source: 'static_seed', data: STATIC_SEED_DATA };
    writeJSON(outPath, payload);
    return { source: 'static_seed', count: payload.data.length };
  }
}

// Static seed fallback (headline file only, used when no key/last-good exists)
const STATIC_SEED_DATA: BPSNationalItem[] = [
  { id: 'ihk-2025-11', indicator: 'ihk', period: 'November 2025', value: 105.2, change_mom: 0.18, change_yoy: 2.9 },
  { id: 'ekspor-2025-11', indicator: 'ekspor', period: 'November 2025', value: 24010000000, change_yoy: 9.14 },
  { id: 'impor-2025-11', indicator: 'impor', period: 'November 2025', value: 19590000000, change_yoy: 3.5 },
  { id: 'ihk-2025-10', indicator: 'ihk', period: 'Oktober 2025', value: 105.02, change_mom: 0.11, change_yoy: 2.8 },
  { id: 'ekspor-2025-10', indicator: 'ekspor', period: 'Oktober 2025', value: 24410000000, change_yoy: 10.25 },
  { id: 'impor-2025-10', indicator: 'impor', period: 'Oktober 2025', value: 21940000000, change_yoy: 16.54 },
];

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
