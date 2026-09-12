/**
 * scripts/ops/freshness.ts — data freshness report generator.
 * Diffs every data surface's newest timestamp against its staleness limit and
 * writes data/ops/freshness.json (surfaced on /operasional). Run daily in CI
 * after the scrapers so staleness is visible instead of silent.
 */

import fs from 'fs';
import path from 'path';
import { log, timestamp, writeJSON, DATA_DIR } from '../config';

export interface FreshnessRule {
  id: string;
  file: string; // path relative to data/ (file or directory)
  limitDays: number;
  note: string;
}

// Limits follow each source's real cadence (conservative tolerances):
export const FRESHNESS_RULES: FreshnessRule[] = [
  { id: 'bps-brs-releases', file: 'bps/ketenagakerjaan', limitDays: 7, note: 'BRS scraper harian; toleransi mingguan' },
  { id: 'news-archive', file: 'news/historical-seed.json', limitDays: 3, note: 'appender harian' },
  { id: 'bi-pmi', file: 'bi/pmi/series.json', limitDays: 100, note: 'sumber kuartalan, poll bulanan' },
  { id: 'asean-fallback', file: 'asean/fallback/_summary.json', limitDays: 40, note: 'World Bank bulanan' },
  { id: 'sdg-sakernas', file: 'bps/sdg-sakernas.json', limitDays: 21, note: 'poll mingguan, sumber 2x/tahun' },
  { id: 'national-indicators', file: 'bps/national-indicators.json', limitDays: 14, note: 'BPS API mingguan' },
  { id: 'provinsi-tpt', file: 'bps/provinsi/tpt.json', limitDays: 14, note: 'BPS API mingguan' },
  { id: 'kemenaker-phk', file: 'kemenaker/phk/articles.json', limitDays: 60, note: 'rilis resmi tidak rutin' },
  { id: 'trends', file: 'trends/node', limitDays: 14, note: 'Google Trends mingguan' },
];

export function computeFreshness(
  input: { lastUpdated?: string; limitDays: number },
  nowIso = new Date().toISOString(),
): { status: 'ok' | 'stale' | 'missing'; ageDays: number } {
  if (!input.lastUpdated) {
    return { status: 'missing', ageDays: Number.POSITIVE_INFINITY };
  }
  const ageDays =
    (new Date(nowIso).getTime() - new Date(input.lastUpdated).getTime()) / 86400000;
  return { status: ageDays <= input.limitDays ? 'ok' : 'stale', ageDays: Number(ageDays.toFixed(1)) };
}

function fileMtime(absPath: string): string {
  return new Date(fs.statSync(absPath).mtimeMs).toISOString();
}

function newestTimestampIn(fileRel: string): string | undefined {
  const abs = path.join(DATA_DIR, fileRel);
  if (!fs.existsSync(abs)) {
    return undefined;
  }
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) {
    let newest: string | undefined;
    for (const f of fs.readdirSync(abs).filter((x) => x.endsWith('.json'))) {
      const m = fileMtime(path.join(abs, f));
      if (!newest || m > newest) {
        newest = m;
      }
    }
    return newest;
  }
  return fileMtime(abs);
}

export function generateFreshnessReport(): {
  generatedAt: string;
  entries: Array<FreshnessRule & { status: 'ok' | 'stale' | 'missing'; ageDays: number; lastUpdated?: string }>;
  staleCount: number;
} {
  const entries = FRESHNESS_RULES.map((rule) => {
    const lastUpdated = newestTimestampIn(rule.file);
    const { status, ageDays } = computeFreshness({ lastUpdated, limitDays: rule.limitDays });
    return { ...rule, status, ageDays, lastUpdated };
  });
  const report = {
    generatedAt: timestamp(),
    entries,
    staleCount: entries.filter((e) => e.status !== 'ok').length,
  };
  writeJSON(path.join(DATA_DIR, 'ops', 'freshness.json'), report);
  log('freshness', `${report.staleCount} dari ${entries.length} sumber stale/missing`);
  return report;
}

if (require.main === module) {
  const r = generateFreshnessReport();
  console.log(`\n=== Freshness Report (${r.generatedAt}) ===`);
  for (const e of r.entries) {
    const mark = e.status === 'ok' ? '✓' : '✗';
    const age = Number.isFinite(e.ageDays) ? `${e.ageDays}d` : 'never';
    console.log(`  ${mark} ${e.id}: ${age} (limit ${e.limitDays}d) — ${e.note}`);
  }
}
