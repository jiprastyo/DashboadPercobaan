/**
 * scripts/tests/tiers.test.ts
 * Guards the tier schedule wiring.
 *
 * Context: bps-sdg-sakernas was runnable only by hand — absent from TIERS and
 * from run-all.ts — so data/bps/sdg-sakernas.json went stale (Jun 11) while the
 * /sdg page showed old numbers under a "stale" badge. This test pins the
 * scraper into the weekly tier so it can never silently fall out again.
 *
 * Run: npx tsx scripts/tests/tiers.test.ts
 */
import assert from 'node:assert/strict';
import { TIERS } from '../config';

assert.ok(
  TIERS.weekly.includes('bps-sdg-sakernas'),
  'bps-sdg-sakernas must be in the weekly tier',
);

// The pre-existing weekly scrapers must not be dropped by edits.
for (const name of ['bps-html', 'kemenaker', 'bps-national', 'bps-provinsi']) {
  assert.ok(TIERS.weekly.includes(name), `weekly tier must keep ${name}`);
}

// asean-nso must stay unscheduled: 6 of 10 hosts are DNS-dead (verified
// 2026-09-12: PSA/THA/VNM do not resolve) and NO page reads data/asean/nso.
// The fallback (World Bank) scraper feeds the UI instead. Do not re-add.
assert.ok(!TIERS.monthly.includes('asean-nso'), 'asean-nso must not be scheduled — dead hosts, zero consumers');
assert.ok(TIERS.monthly.includes('asean-fallback'), 'asean-fallback feeds getASEANHistoricalData — keep it');

// No scraper may appear twice in the schedule.
const all = [...TIERS.daily, ...TIERS.weekly, ...TIERS.monthly];
const dupes = all.filter((n, i) => all.indexOf(n) !== i);
assert.deepEqual(dupes, [], 'no duplicate scraper names across tiers');

console.log('tiers wiring tests passed');
