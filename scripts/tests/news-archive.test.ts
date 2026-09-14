/**
 * scripts/tests/news-archive.test.ts
 * Guards the news archive invariants after the 2026-09-14 normalization:
 * unique ids, no UI-dead fields, no record loss.
 * Run: npx tsx scripts/tests/news-archive.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const DEAD_KEYS = ['summary', 'outlet', 'categories', 'kbli_sectors'];
const REQUIRED = ['id', 'title', 'date', 'source', 'source_name', 'excerpt',
  'sector_tags', 'keywords_matched', '_source_url', '_scraped_at',
  'is_estimated', 'date_source', 'resolved_url'];

const archive = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'news', 'historical-seed.json'), 'utf-8'),
) as Array<Record<string, unknown>>;

assert.ok(Array.isArray(archive) && archive.length >= 5359,
  `no record loss: have ${archive.length}, floor 5359 (2026-09-14 baseline)`);

const ids = archive.map((a) => String(a.id));
assert.equal(new Set(ids).size, ids.length, 'every id must be unique');

for (const [i, row] of archive.entries()) {
  for (const key of DEAD_KEYS) {
    assert.ok(!(key in row), `row ${i} must not carry dead key "${key}"`);
  }
  for (const key of REQUIRED) {
    assert.ok(row[key] !== undefined && row[key] !== null && row[key] !== '',
      `row ${i} (${ids[i]}) missing required key "${key}"`);
  }
  const dup = row.duplicate_ids as string[] | undefined;
  if (dup) {
    assert.ok(!dup.includes(String(row.id)), `row ${i} duplicate_ids must exclude its own id`);
  }
}
console.log(`news-archive.test: ${archive.length} rows OK`);
