/**
 * scripts/tests/pmi-backfill.test.ts
 * Guards PMI history harvest from BI's official quarterly table ZIP
 * (Tabel PMI BI Tw <Q> <Y>.xlsx — sheet "T1 PMI", composite "PMI - BI" row,
 * 2010→present, one column per quarter).
 * Run: npx tsx scripts/tests/pmi-backfill.test.ts
 */
import assert from 'node:assert/strict';
import {
  quarterUrl,
  parsePmiTable,
  mergeQuarterSeries,
  registryHasQuarter,
  latestKnownZipPeriod,
  type QuarterRegistryEntry,
} from '../scrapers/bi-pmi-backfill';

// ── quarterUrl ──────────────────────────────────────────────────────────────
assert.equal(
  quarterUrl(1, 2026),
  'https://www.bi.go.id/id/publikasi/laporan/Pages/PMI-Triwulan-I-2026.aspx',
);
assert.equal(
  quarterUrl(4, 2025),
  'https://www.bi.go.id/id/publikasi/laporan/Pages/PMI-Triwulan-IV-2025.aspx',
);

// ── parsePmiTable: the composite row mapped onto year/quarter headers ──────
// Synthetic sheet mirroring the real layout: label col 0, year row spans,
// quarter row beneath, composite "PMI - BI" row.
const fakeSheet = [
  ['TABEL 1. PROMPT MANUFACTURING INDEX - BI', null, null, null, null],
  ['(%, Indeks)', null, null, null, null],
  ['Komponen PMI', 2019, null, 2020, null],
  [null, 'I', 'II', 'I', null],
  ['Volume Produksi', 55.1, 56.2, 50.3, null],
  ['PMI - BI', 52.65, 52.66, 45.64, null],
];
assert.deepEqual(
  parsePmiTable(fakeSheet),
  [
    { period: '2019-T1', pmi_value: 52.65 },
    { period: '2019-T2', pmi_value: 52.66 },
    { period: '2020-T1', pmi_value: 45.64 },
  ],
  'maps composite row onto year-span headers',
);

// Quarter with no value (None) is skipped, not zero.
const gapSheet = [
  ['Komponen PMI', 2019, null],
  [null, 'I', 'II'],
  ['PMI - BI', 52.65, null],
];
assert.deepEqual(
  parsePmiTable(gapSheet),
  [{ period: '2019-T1', pmi_value: 52.65 }],
  'null cells skipped',
);

// No composite row → empty (never guess from sub-components).
const noComp = [
  ['Komponen PMI', 2019, null],
  [null, 'I', 'II'],
  ['Volume Produksi', 55.1, 56.2],
];
assert.deepEqual(parsePmiTable(noComp), [], 'missing PMI - BI row → empty');

// ── latestKnownZipPeriod ────────────────────────────────────────────────────
// Registry drives which report page to harvest next month.
assert.equal(latestKnownZipPeriod([]), null, 'empty registry → null');
assert.equal(
  latestKnownZipPeriod([{ period: '2025-T3', url: 'x', exists: true, parsed: true } as QuarterRegistryEntry]),
  '2025-T3',
);
assert.equal(
  latestKnownZipPeriod([
    { period: '2025-T3', url: 'x', exists: true, parsed: true },
    { period: '2026-T1', url: 'x', exists: false, parsed: false },
  ] as QuarterRegistryEntry[]),
  '2025-T3',
  'unparsed entries do not advance the frontier',
);

// ── mergeQuarterSeries ─────────────────────────────────────────────────────
const existing: import('../../src/lib/pmi-parser').PmiSeriesItem[] = [
  { period: '2026-T2', pmi_value: 51.43, _source_url: 'https://x', _scraped_at: '2026-09-12T00:00:00Z' },
  { period: '2026-T1', pmi_value: 52.03, _source_url: 'https://x', _scraped_at: '2026-09-12T00:00:00Z' },
];
const merged = mergeQuarterSeries(
  [
    { period: '2025-T4', pmi_value: 51.86 },
    { period: '2026-T1', pmi_value: 52.03 },
    { period: '2025-T3', pmi_value: 51.66 },
  ],
  existing,
);
assert.equal(merged.length, 4, 'existing + harvested deduped by period');
assert.deepEqual(merged.map((x) => x.period), ['2026-T2', '2026-T1', '2025-T4', '2025-T3'], 'newest first');
assert.ok(merged.every((x) => x._source_url && x._scraped_at), 'metadata always present');
// Existing committed values are authoritative (scraped from press release text).
assert.equal(merged.find((x) => x.period === '2026-T1')?.pmi_value, 52.03, 'existing period preserved');

// ── registryHasQuarter ──────────────────────────────────────────────────────
assert.equal(registryHasQuarter([], '2026-T2'), false, 'empty registry → not found');
assert.equal(
  registryHasQuarter([{ period: '2026-T2', url: 'x', exists: true, parsed: true } as QuarterRegistryEntry], '2026-T2'),
  true,
);
assert.equal(
  registryHasQuarter([{ period: '2026-T2', url: 'x', exists: false, parsed: false } as QuarterRegistryEntry], '2026-T2'),
  false,
  'nonexistent page is not "have" — re-probe allowed',
);

console.log('pmi backfill tests passed');

