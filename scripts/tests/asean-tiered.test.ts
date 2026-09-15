/**
 * scripts/tests/asean-tiered.test.ts
 * Guards the tiered ASEAN cascade logic offline (fixtures = live shapes
 * captured 2026-09-16): parser correctness and the tier-merge rule
 * "first answering tier wins per (country, indicator, year)".
 *
 * Run: npx tsx scripts/tests/asean-tiered.test.ts
 */
import assert from 'node:assert/strict';
import {
  parseMalaysia,
  parseSingstatTable,
  parseSingstatDgs,
  parsePhilippines,
  parseWorldBank,
  parseOwidCsv,
  buildMerged,
  readArchive,
  ASEAN_PROVENANCE,
  type Buckets,
} from '../scrapers/asean-tiered';

// ─── Tier 1: Malaysia (DOSM catalogue shape) ─────────────────────────────────
const mys = parseMalaysia([
  { date: '2026-06-01', u_rate: 3.1, p_rate: 70.2, ep_ratio: 68.0, other: 1 },
  { date: '2026-05-01', u_rate: 3.2, p_rate: 70.1, ep_ratio: 67.9 },
  { date: '2025-12-01', u_rate: 3.4, p_rate: 70.5, ep_ratio: 68.2 },
  { date: 'not-a-date', u_rate: 9.9 },
  { date: '2026-01-01', u_rate: null },
])!;
assert.ok(mys, 'DOSM parse ok');
assert.equal(mys['SL.UEM.TOTL.ZS'].get('2026')!.sum.toFixed(4), (3.1 + 3.2).toFixed(4), 'monthly points average into 2026');
assert.equal(mys['SL.TLF.CACT.ZS'].get('2025')!.n, 1);

// ─── Tier 1: Singapore (TableBuilder quarterly + data.gov.sg columns) ───────
const sgv = parseSingstatTable({
  Data: {
    row: [
      { rowText: 'Resident Unemployment Rate', columns: [{ key: '2025 4Q', value: '1.8' }] },
      {
        rowText: 'Total Unemployment Rate',
        columns: [
          { key: '2025 4Q', value: '1.8' },
          { key: '2026 1Q', value: '1.9' },
          { key: '2026 2Q', value: '2.4' },
          { key: 'footnote', value: 'x' },
        ],
      },
    ],
  },
})!;
assert.ok(sgv, 'TableBuilder parse ok');
assert.equal(Math.abs(sgv.get('2026')!.sum / sgv.get('2026')!.n - 2.15) < 1e-9, true, '2026 avg of 1.9 & 2.4');

const sgd = parseSingstatDgs({
  result: { records: [{ DataSeries: 'Total Unemployment Rate, (SA)', '20262Q': 2.4, '20261Q': 1.9, '20254Q': 1.8 }] },
})!;
assert.ok(sgd.get('2026'), 'data.gov.sg parse ok');

// ─── Tier 1: Philippines (PSA PXWeb meta + full-table POST shapes) ──────────
const meta = {
  variables: [
    { code: 'Year', values: ['20', '21'], valueTexts: ['2025', '2026'] },
    { code: 'Month', values: ['0', '12'], valueTexts: ['April', 'Annual'] },
    { code: 'Rates', values: ['0', '1', '2', '3'], valueTexts: ['Labor Force Participation Rate', 'Employment Rate', 'Unemployment Rate', 'Underemployment Rate'] },
    { code: 'Sex', values: ['0', '1', '2'], valueTexts: ['Both sexes', 'Male', 'Female'] },
  ],
};
const full = {
  data: [
    { key: ['20', '12', '2', '0'], values: ['4.3'] }, // 2025 Annual Unemployment Both
    { key: ['21', '0', '2', '0'], values: ['4.1'] }, // 2026 April (not annual) → ignored
    { key: ['21', '12', '2', '0'], values: ['3.9'] }, // 2026 Annual
    { key: ['21', '12', '0', '0'], values: ['44.5'] }, // 2026 Annual LFPR
    { key: ['20', '12', '0', '0'], values: ['45.0'] }, // 2025 Annual LFPR
    { key: ['21', '12', '1', '0'], values: ['96.1'] }, // 2026 Employment Rate (share of labor force!) → must NOT map to EPR
    { key: ['20', '12', '2', '1'], values: ['9.9'] }, // male → ignored
    { key: ['20', '12', '1', '0'], values: ['.'] }, // missing → ignored
  ],
};
const phl = parsePhilippines(meta, full);
assert.equal(phl['SL.UEM.TOTL.ZS'].get('2026')!.sum, 3.9, 'PSA annual-only, both-sexes, correct rate');
assert.equal(phl['SL.UEM.TOTL.ZS'].get('2025')!.sum, 4.3);
assert.equal(phl['SL.TLF.CACT.ZS'].size, 2);
// EPR must be the DERIVED population ratio, never the share-of-labor-force
// "Employment Rate" (the 2026-09-16 bug: 95.8% instead of ~42.8%).
assert.ok(phl['SL.EMP.TOTL.SP.ZS'], 'EPR derived from official LFPR×(1−UE)');
assert.equal(phl['SL.EMP.TOTL.SP.ZS'].get('2026')!.sum, Number((44.5 * (1 - 3.9 / 100)).toFixed(3)), 'EPR 2026 = LFPR*(1−UE)');
assert.ok(phl['SL.EMP.TOTL.SP.ZS'].get('2026')!.sum < 50, 'EPR stays in population-ratio range');

// ─── Tier 2: World Bank modeled ──────────────────────────────────────────────
const wb = parseWorldBank([
  { page: 1, pages: 1, total: 3 },
  [
    { country: { id: 'MY', value: 'Malaysia' }, indicator: { id: 'SL.UEM.TOTL.ZS' }, date: '2024', value: 3.846 },
    { country: { id: 'MY', value: 'Malaysia' }, indicator: { id: 'SL.UEM.TOTL.ZS' }, date: '2025', value: 3.764 },
    { country: { id: 'TH', value: 'Thailand' }, indicator: { id: 'SL.UEM.TOTL.ZS' }, date: '2025', value: 0.94 },
    { country: { id: 'XX', value: 'Nowhere' }, indicator: { id: 'SL.UEM.TOTL.ZS' }, date: '2025', value: 5 },
    { country: { id: 'SG', value: 'Singapore' }, indicator: { id: 'SL.UEM.TOTL.ZS' }, date: '2025', value: null },
  ],
])!;
assert.ok(wb.MYS && wb.THA, 'WB maps ISO2→ISO3, drops unknown');
assert.equal(wb.MYS['SL.UEM.TOTL.ZS'].length, 2);
assert.ok(!wb.SGP, 'WB null values dropped');
assert.equal(wb.MYS['SL.UEM.TOTL.ZS'][0].kind, 'modeled', 'WB values tagged modeled');

// ─── Tier 3: OWID CSV ────────────────────────────────────────────────────────
const owid = parseOwidCsv(
  'Entity,Code,Year,Unemployment rate\nMalaysia,MYS,2025,3.764\nThailand,THA,2025,0.94\nAfghanistan,AFG,2025,7.9\nBad,XXX,,,\n',
);
assert.ok(owid.MYS && !owid.AFG, 'OWID keeps ASEAN only');
assert.equal(owid.MYS[0].kind, 'modeled');

// ─── Merge rule: official (tier 1) beats modeled per year; modeled fills gaps ─
const tier1 = { MYS: wb_to_buckets_shim() };
function wb_to_buckets_shim(): Record<string, Buckets> {
  const out: Record<string, Buckets> = {};
  const b: Buckets = new Map();
  b.set('2025', { sum: 3.1, n: 1 });
  out['SL.UEM.TOTL.ZS'] = b;
  return out;
}
const tier2 = {
  MYS: { 'SL.UEM.TOTL.ZS': [{ year: '2024', value: 3.8, kind: 'modeled' as const, source: 'worldbank' }, { year: '2025', value: 3.76, kind: 'modeled' as const, source: 'worldbank' }] },
  THA: { 'SL.UEM.TOTL.ZS': [{ year: '2025', value: 0.94, kind: 'modeled' as const, source: 'worldbank' }] },
};
const merged = buildMerged(tier1, tier2, null);
const mysRow = merged.countries.find((c) => c.iso3 === 'MYS')!;
const ue = mysRow.indicators['SL.UEM.TOTL.ZS'].values;
assert.equal(ue.find((v) => v.year === '2025')!.kind, 'official', 'tier1 wins for overlapping year');
assert.equal(ue.find((v) => v.year === '2025')!.value, 3.1);
assert.equal(ue.find((v) => v.year === '2024')!.kind, 'modeled', 'tier2 fills older years');
assert.equal(merged.indicatorProvenance.MYS['SL.UEM.TOTL.ZS'], 'dosm', 'source label from tier1 id');
assert.ok(merged.countries.find((c) => c.iso3 === 'THA'), 'modeled-only country included');
assert.equal(merged.indicatorProvenance.THA['SL.UEM.TOTL.ZS'], 'worldbank');
// No duplicated country entries (the 2026-09-16 bug: tier1+modeled lists overlapped).
const codes = merged.countries.map((c) => c.iso3);
assert.equal(new Set(codes).size, codes.length, 'each country appears once');
// PHL EPR from the tier-1 PSA buckets must come out tagged 'derived', not
// 'official' (it is arithmetic on two official rates) — UI leaves derived
// points solid, so the kind matters for label honesty.
const phB: Buckets = new Map([['2025', { sum: 61.377, n: 1 }]]);
const merged2 = buildMerged({ PHL: { 'SL.UEM.TOTL.ZS': new Map([['2025', { sum: 4.189, n: 1 }]]), 'SL.TLF.CACT.ZS': new Map([['2025', { sum: 64.06, n: 1 }]]), 'SL.EMP.TOTL.SP.ZS': phB } }, null, null);
const phlEpr = merged2.countries.find((c) => c.iso3 === 'PHL')!.indicators['SL.EMP.TOTL.SP.ZS'].values[0];
assert.equal(phlEpr.kind, 'derived', 'PHL EPR from tier1 carries derived kind');

// ─── Provenance registry consistency ────────────────────────────────────────
assert.equal(ASEAN_PROVENANCE.worldbank.kind, 'modeled');
assert.equal(ASEAN_PROVENANCE.owid.kind, 'modeled');
assert.equal(ASEAN_PROVENANCE.dosm.kind, 'official');
assert.equal(ASEAN_PROVENANCE.archive.kind, 'archive');

// ─── readArchive: survives legacy file shape (values without kind) ──────────
const arc = readArchive();
assert.ok(arc, 'archive readable from current repo file');
// IDN IS archived now (2026-09-16 change): if all network tiers fail, an
// archive ID row is better than losing the overview snapshot's comparator.
// The makro-asean page still overrides IDN with BPS at read time.
assert.ok(arc!.countries.some((c) => c.countryCode === 'ID'), 'IDN archived for total-failure mode');
assert.ok(arc!.countries.every((c) => c.indicators['SL.UEM.TOTL.ZS'] || Object.keys(c.indicators).length > 0), 'archived countries carry indicators');

console.log('asean tiered tests passed');
