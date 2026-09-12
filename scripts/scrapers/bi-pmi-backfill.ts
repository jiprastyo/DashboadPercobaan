/**
 * scripts/scrapers/bi-pmi-backfill.ts — PMI history harvest from BI's official
 * quarterly table ZIP.
 *
 * Discovery (2026-09-13): each quarterly report page
 * (/id/publikasi/laporan/Pages/PMI-Triwulan-<Q>-<Y>.aspx) links a
 * "Data Series Prompt Manufacturing Index.zip" whose XLSX ("T1 PMI" sheet)
 * holds the ENTIRE composite history 2010→present — one column per quarter,
 * composite row "PMI - BI". One download replaces page-by-page probing and
 * covers 63+ quarters, including revisions.
 *
 * The harvest registry (data/bi/pmi/_quarters.json) records the newest
 * quarter seen in the ZIP so monthly runs know the frontier and whether a new
 * report page is worth fetching.
 */

import * as XLSX from 'xlsx';
import zlib from 'zlib';
import path from 'path';
import {
  fetchWithRetry,
  log,
  writeJSON,
  readJSON,
  timestamp,
  ensureDir,
} from '../config';
import type { PmiSeriesItem } from '../../src/lib/pmi-parser';

export const QUARTER_PAGES_DIR = path.join(process.cwd(), 'data', 'bi', 'pmi');
export const QUARTERS_REGISTRY = path.join(QUARTER_PAGES_DIR, '_quarters.json');

const REPORT_PAGE_BASE = 'https://www.bi.go.id/id/publikasi/laporan/Pages/';
const DOC_ZIP_URL = 'https://www.bi.go.id/id/publikasi/laporan/Documents/PMI.zip';
const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;
const QUARTER_VAL: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

export interface QuarterRegistryEntry {
  period: string; // "2025-T3" — newest quarter present in the harvested ZIP
  url: string;
  exists: boolean;
  parsed: boolean;
}

export function quarterUrl(quarter: number, year: number): string {
  return `${REPORT_PAGE_BASE}PMI-Triwulan-${ROMAN[quarter]}-${year}.aspx`;
}

type SheetRow = Array<string | number | null>;

/**
 * Parse the "T1 PMI" sheet. Layout (real file, 2026-09-13): year headers span
 * multiple columns (row 3), quarter labels beneath (row 4), component labels
 * in column 0, composite row "PMI - BI" near the bottom. Only the composite
 * row is used — sub-components are never averaged or guessed.
 */
export function parsePmiTable(sheet: SheetRow[]): Array<{ period: string; pmi_value: number }> {
  // Find the quarter-label row: contains I/II/III/IV strings; the year row is
  // the one directly above it (with 2009-2035 numbers).
  let yearRowIdx = -1;
  let quarterRowIdx = -1;
  for (let i = 1; i < Math.min(sheet.length, 12); i++) {
    const r = sheet[i];
    const hasQuarters = r.some((v) => typeof v === 'string' && QUARTER_VAL[v.trim()] !== undefined);
    const above = sheet[i - 1] ?? [];
    const hasYears = above.some((v) => typeof v === 'number' && v >= 2009 && v <= 2035);
    if (hasQuarters && hasYears) {
      quarterRowIdx = i;
      yearRowIdx = i - 1;
      break;
    }
  }
  if (quarterRowIdx < 0) {
    return [];
  }
  const years = sheet[yearRowIdx];
  const quarters = sheet[quarterRowIdx];

  // Composite row: any row whose first two cells include "PMI - BI".
  const compositeRow = sheet.find((r) =>
    r.slice(0, 3).some((v) => typeof v === 'string' && /pmi\s*[-–]?\s*bi/i.test(v)),
  );
  if (!compositeRow) {
    return [];
  }

  const out: Array<{ period: string; pmi_value: number }> = [];
  let currentYear: number | null = null;
  for (let col = 0; col < compositeRow.length; col++) {
    const y = years[col];
    if (typeof y === 'number' && y >= 2009 && y <= 2035) {
      currentYear = y;
    }
    const q = quarters[col];
    if (currentYear === null || typeof q !== 'string') {
      continue;
    }
    const quarter = QUARTER_VAL[q.trim()];
    if (!quarter) {
      continue;
    }
    const v = compositeRow[col];
    if (typeof v === 'number' && Number.isFinite(v)) {
      out.push({ period: `${currentYear}-T${quarter}`, pmi_value: Number(v.toFixed(2)) });
    }
  }
  return out;
}

/** Newest parsed quarter in the registry (the harvest frontier). */
export function latestKnownZipPeriod(registry: QuarterRegistryEntry[]): string | null {
  const parsed = registry.filter((e) => e.exists && e.parsed).map((e) => e.period);
  return parsed.length ? parsed.sort().at(-1) ?? null : null;
}

/** Consult the persisted registry: has this quarter already been harvested? */
export function registryHasQuarter(
  registry: QuarterRegistryEntry[],
  period: string,
): boolean {
  return registry.some((e) => e.period === period && e.exists && e.parsed);
}

function quarterUrlFromPeriod(period: string): string {
  const m = /^(\d{4})-T(\d)$/.exec(period);
  if (!m) {
    return 'https://www.bi.go.id/id/publikasi/laporan/default.aspx';
  }
  return quarterUrl(Number(m[2]), Number(m[1]));
}

/**
 * Merge harvested quarters into the existing series by period. Existing
 * entries win (press-release text is the newest publication); only missing
 * periods are appended. Newest-first output.
 */
export function mergeQuarterSeries(
  harvested: Array<{ period: string; pmi_value: number }>,
  existing: PmiSeriesItem[],
): PmiSeriesItem[] {
  const byPeriod = new Map<string, PmiSeriesItem>();
  for (const item of existing) {
    if (typeof item.pmi_value === 'number') {
      byPeriod.set(item.period, item);
    }
  }
  for (const h of harvested) {
    if (!byPeriod.has(h.period)) {
      byPeriod.set(h.period, {
        period: h.period,
        pmi_value: h.pmi_value,
        category: 'PMI-BI (Prompt Manufacturing Index)',
        description: 'Seri resmi BI (Tabel PMI, sheet T1)',
        sub_indices: { output: 0, new_orders: 0, employment: 0 },
        _source_url: quarterUrlFromPeriod(h.period),
        _scraped_at: timestamp(),
      });
    }
  }
  return Array.from(byPeriod.values()).sort((a, b) => b.period.localeCompare(a.period));
}

/**
 * Extract the single XLSX member from the ZIP payload. BI's server streams
 * with data-descriptors (local header sizes are 0), so sizes come from the
 * central directory. Returns the raw XLSX buffer.
 */
export function extractXlsxFromZip(zipBuf: Buffer): Buffer {
  // End of Central Directory record (PK\x05\x06) scanned from the tail.
  let eocd = -1;
  for (let i = zipBuf.length - 22; i >= 0; i--) {
    if (zipBuf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error('ZIP EOCD not found');
  }
  const count = zipBuf.readUInt16LE(eocd + 10);
  let p = zipBuf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (zipBuf.readUInt32LE(p) !== 0x02014b50) {
      throw new Error(`bad central-directory signature at ${p}`);
    }
    const method = zipBuf.readUInt16LE(p + 10);
    const compSize = zipBuf.readUInt32LE(p + 20);
    const nameLen = zipBuf.readUInt16LE(p + 28);
    const extraLen = zipBuf.readUInt16LE(p + 30);
    const commentLen = zipBuf.readUInt16LE(p + 32);
    const localOff = zipBuf.readUInt32LE(p + 42);
    const name = zipBuf.slice(p + 46, p + 46 + nameLen).toString();
    if (/\.xlsx$/i.test(name)) {
      const lNameLen = zipBuf.readUInt16LE(localOff + 26);
      const lExtraLen = zipBuf.readUInt16LE(localOff + 28);
      const dataStart = localOff + 30 + lNameLen + lExtraLen;
      const raw = zipBuf.slice(dataStart, dataStart + compSize);
      return method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('no .xlsx member in ZIP');
}

async function fetchZipAndParse(): Promise<Array<{ period: string; pmi_value: number }>> {
  const res = await fetchWithRetry(DOC_ZIP_URL, { redirect: 'follow' }, 2);
  if (res.status !== 200) {
    throw new Error(`PMI.zip fetch returned ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.slice(0, 2).toString() !== 'PK') {
    throw new Error('PMI.zip did not return a ZIP payload');
  }
  const xlsxBuf = extractXlsxFromZip(buf);
  const workbook = XLSX.read(xlsxBuf, { type: 'buffer' });
  const sheetName = workbook.SheetNames.find((n) => /T1/i.test(n)) ?? workbook.SheetNames[0];
  const sheet = XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: null,
  });
  return parsePmiTable(sheet);
}

export async function runPMIBackfill(): Promise<{
  total: number;
  found: number;
  frontier: string | null;
}> {
  const harvested = await fetchZipAndParse();
  const frontier = harvested.length ? harvested.map((h) => h.period).sort().at(-1) ?? null : null;
  log('bi-pmi-backfill', `ZIP table parsed: ${harvested.length} quarters, frontier ${frontier}`);

  ensureDir(QUARTER_PAGES_DIR);
  if (frontier) {
    writeJSON(QUARTERS_REGISTRY, {
      harvested_at: timestamp(),
      frontier,
      quarters: [{ period: frontier, url: DOC_ZIP_URL, exists: true, parsed: true }],
    });
  }

  const seriesPath = path.join(QUARTER_PAGES_DIR, 'series.json');
  const existing = readJSON<PmiSeriesItem[]>(seriesPath) || [];
  const merged = mergeQuarterSeries(harvested, existing);
  writeJSON(seriesPath, merged);
  const added = merged.length - new Set([...existing.map((e) => e.period)]).size;
  log('bi-pmi-backfill', `${added} periods added, series now ${merged.length} quarters`);
  return { total: merged.length, found: added, frontier };
}

if (require.main === module) {
  runPMIBackfill()
    .then((r) => log('bi-pmi-backfill', `Done. ${JSON.stringify(r)}`))
    .catch((err) => {
      log('bi-pmi-backfill', `Fatal: ${err}`);
      process.exit(1);
    });
}
