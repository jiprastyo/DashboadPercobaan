/**
 * scripts/tests/pmi-parser.test.ts
 * Guards the BI PMI press-release parser.
 *
 * Context: data/bi/pmi/series.json has been [] since 2026-06-07. The old
 * scraper targeted BI's survey-report listing page, which renders no data
 * tables (verified in CI logs: "Extracted 0 data points" then status success).
 * The real source is BI's quarterly press releases: "tecermin dari PMI-BI
 * sebesar 51,43%" (sp_2813926.aspx, Triwulan II 2026). BRS archive has no PMI.
 * "PMI" also means Pekerja Migran Indonesia in other contexts — must not match.
 *
 * Run: npx tsx scripts/tests/pmi-parser.test.ts
 */
import assert from 'node:assert/strict';
import { parsePmiFromText, buildPmiSeries } from '../../src/lib/pmi-parser';

// ── parsePmiFromText ───────────────────────────────────────────────────────
assert.equal(parsePmiFromText('tecermin dari PMI-BI sebesar 51,43%'), 51.43, 'release phrasing');
assert.equal(parsePmiFromText('PMI-BI triwulan I 2026 sebesar 52,03%'), 52.03, 'quarter phrasing');

// PMI ≠ Pekerja Migran Indonesia (migrant-worker text must not match).
assert.equal(parsePmiFromText('Pelindungan Pekerja Migran ASEAN'), null, 'migrant text → null');
assert.equal(parsePmiFromText('PMI (Pekerja Migran Indonesia) dilindungi'), null, 'PMI migrant expansion → null');

// Unrelated percentages must not match.
assert.equal(parsePmiFromText('Rata-rata upah naik 6,5 persen'), null, 'wage text → null');
assert.equal(parsePmiFromText(''), null, 'empty → null');

// Out-of-range values rejected (PMI is 0-100).
assert.equal(parsePmiFromText('PMI-BI sebesar 143,00%'), null, 'out-of-range → null');

// ── buildPmiSeries ─────────────────────────────────────────────────────────
const s = buildPmiSeries([
  { date: '2026-07-17', title: 'PMI-BI Triwulan II 2026 sebesar 51,43%', summary: '' },
  { date: '2026-04-17', title: 'PMI-BI Triwulan I 2026 sebesar 52,03%', summary: '' },
  { date: '2026-09-12', title: 'Pekerja Migran Indonesia dilindungi', summary: '' },
]);
assert.equal(s.length, 2, 'migrant row skipped');
assert.deepEqual(s.map((x) => x.pmi_value), [51.43, 52.03], 'newest first');
assert.ok(s[0].sub_indices && typeof s[0].sub_indices.output === 'number', 'sub_indices always present');

// Dedup by period: one release per quarter survives.
const dup = buildPmiSeries([
  { date: '2026-07-17', title: 'PMI-BI Triwulan II 2026 sebesar 51,43%', summary: '' },
  { date: '2026-07-18', title: 'PMI-BI Triwulan II 2026 (revisi) sebesar 51,50%', summary: '' },
]);
assert.equal(dup.length, 1, 'same period deduped');
assert.equal(dup[0].pmi_value, 51.5, 'later revision wins');

// Empty input → empty output.
assert.deepEqual(buildPmiSeries([]), [], 'empty input → empty');

console.log('pmi parser tests passed');
