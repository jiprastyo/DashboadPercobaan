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
// asean-tiered (2026-09-16) is the successor that feeds the UI: it re-probed
// PSA/SingStat/DOSM as LIVE (the DNS-dead finding was local-runner only) and
// cascades NSO → World Bank modeled → OWID modeled → repo archive.
// asean-fallback must stay scheduled BEFORE asean-tiered: fallback refreshes
// the raw WB per-indicator files (asean-coverage test reads them), and
// tiered writes _by_country.json last so its provenance merge wins.
assert.ok(!TIERS.monthly.includes('asean-nso'), 'asean-nso must not be scheduled — dead hosts, zero consumers');
assert.ok(TIERS.monthly.includes('asean-fallback'), 'asean-fallback refreshes raw WB files — keep it');
assert.ok(TIERS.monthly.includes('asean-tiered'), 'asean-tiered writes the UI _by_country.json — keep it');
assert.ok(
  TIERS.monthly.indexOf('asean-fallback') < TIERS.monthly.indexOf('asean-tiered'),
  'asean-tiered must run AFTER asean-fallback (it overwrites _by_country.json)',
);

// No scraper may appear twice in the schedule.
const all = [...TIERS.daily, ...TIERS.weekly, ...TIERS.monthly];
const dupes = all.filter((n, i) => all.indexOf(n) !== i);
assert.deepEqual(dupes, [], 'no duplicate scraper names across tiers');

console.log('tiers wiring tests passed');
