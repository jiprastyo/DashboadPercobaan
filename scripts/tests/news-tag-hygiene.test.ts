/**
 * scripts/tests/news-tag-hygiene.test.ts
 * Keyword tags must be unique (case-insensitively), lowercase-normalized,
 * and paired with a non-empty sector marker.
 * Run: npx tsx scripts/tests/news-tag-hygiene.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const archive = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'news', 'historical-seed.json'), 'utf-8'),
) as Array<Record<string, unknown>>;

let generalRows = 0;
let dupSectorRows = 0;

for (const [i, row] of archive.entries()) {
  const kws = (row.keywords_matched as string[] | undefined) ?? [];
  const lowered = kws.map((k) => k.toLowerCase());

  assert.equal(new Set(lowered).size, lowered.length,
    `row ${i} has duplicate keyword tags: ${JSON.stringify(kws)}`);

  for (const k of kws) {
    assert.equal(k, k.toLowerCase(), `row ${i} keyword "${k}" must be lowercase`);
    assert.equal(k.trim(), k, `row ${i} keyword "${k}" has stray whitespace`);
  }

  const sectors = (row.sector_tags as string[] | undefined) ?? [];
  assert.ok(sectors.length > 0, `row ${i} must have at least one sector tag`);
  if (sectors.length === 1 && sectors[0] === 'general') generalRows += 1;

  const lowerSectors = sectors.map((s) => s.toLowerCase());
  assert.equal(new Set(lowerSectors).size, lowerSectors.length,
    `row ${i} has duplicate sector tags: ${JSON.stringify(sectors)}`);
  if (new Set(lowerSectors).size !== lowerSectors.length) dupSectorRows += 1;
}

console.log(`news-tag-hygiene.test: ${archive.length} rows OK`);
console.log(`  rows still tagged only 'general': ${generalRows}`);
console.log(`  rows with duplicate sector tags : ${dupSectorRows}`);
console.log(`  (general is allowed and expected — it means "no sector vocabulary found")`);
