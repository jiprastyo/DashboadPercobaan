/**
 * scripts/repair-news-tags.ts
 * One-shot repair of historical-seed.json tag hygiene:
 *   - collapse case-insensitive duplicate keywords/tags
 *   - lowercase every keyword and tag
 *   - guarantee non-empty keywords_matched and sector_tags
 *   - add a `labor_topic` boolean flag (does the row carry labor evidence?)
 *
 * SAFETY: this script must NEVER delete a row. It asserts the row count is
 * unchanged before writing, and it reports every row it modifies.
 * Run: npx tsx scripts/repair-news-tags.ts
 */
import fs from 'fs';
import path from 'path';
import { LABOR_KEYWORDS } from './config';

const ARCHIVE = path.join(process.cwd(), 'data', 'news', 'historical-seed.json');
const rows = JSON.parse(fs.readFileSync(ARCHIVE, 'utf-8')) as Array<Record<string, unknown>>;
const rowsBefore = rows.length;

const laborSet = new Set(LABOR_KEYWORDS.map((k) => k.toLowerCase()));

/** Dedupe case-insensitively, trim, lowercase, preserve first-seen order. */
function dedupeCaseInsensitive(values: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

let changed = 0;
let laborFlagged = 0;
const samples: string[] = [];

for (const row of rows) {
  const before = JSON.stringify([row.keywords_matched, row.sector_tags, row.labor_topic]);

  const kws = dedupeCaseInsensitive((row.keywords_matched as unknown[]) ?? []);
  row.keywords_matched = kws;

  const sectors = dedupeCaseInsensitive((row.sector_tags as unknown[]) ?? []);
  row.sector_tags = sectors.length ? sectors : ['general'];

  // Honest flag: does this row carry ANY labor keyword?
  const labor = kws.filter((k) => laborSet.has(k));
  row.labor_topic = labor.length > 0;
  if (labor.length > 0) laborFlagged += 1;

  if (JSON.stringify([row.keywords_matched, row.sector_tags, row.labor_topic]) !== before) {
    changed += 1;
    if (samples.length < 5 && kws.length < 4) {
      samples.push(`row ${rows.indexOf(row)}: kw=${JSON.stringify(kws)}`);
    }
  }
}

// ── SAFETY: refuse to write if any row was lost ──────────────────────────────
if (rows.length !== rowsBefore) {
  throw new Error(`ABORT: row count changed ${rowsBefore} -> ${rows.length}. Nothing written.`);
}
const emptyKw = rows.filter((r) => !Array.isArray(r.keywords_matched) || r.keywords_matched.length === 0).length;
if (emptyKw > 0) {
  throw new Error(`ABORT: ${emptyKw} row(s) would have empty keywords_matched. Nothing written.`);
}

fs.writeFileSync(ARCHIVE, `${JSON.stringify(rows, null, 2)}\n`);

console.log(`repair-news-tags: ${rows.length} rows scanned (was ${rowsBefore}), ${changed} changed`);
console.log(`  rows with labor keywords        : ${laborFlagged}/${rows.length}`);
console.log(`  rows tagged only 'general'      : ${rows.filter((r) => JSON.stringify(r.sector_tags) === '["general"]').length}`);
console.log(`  rows with empty keywords_matched: ${emptyKw}`);
console.log('  sample repaired rows:');
for (const s of samples) console.log(`    ${s}`);
