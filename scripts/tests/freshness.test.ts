/**
 * scripts/tests/freshness.test.ts
 * Guards the freshness report generator + tier completeness.
 * Run: npx tsx scripts/tests/freshness.test.ts
 */
import assert from 'node:assert/strict';
import { computeFreshness } from '../ops/freshness';
import { TIERS } from '../config';

// Synthetic: 5-day-old file is fresh at limit 7; 10-day-old is stale.
const now = '2026-09-13T00:00:00Z';
assert.equal(
  computeFreshness({ lastUpdated: '2026-09-08T00:00:00Z', limitDays: 7 }, now).status,
  'ok',
  '5-day-old within 7-day limit',
);
assert.equal(
  computeFreshness({ lastUpdated: '2026-09-03T00:00:00Z', limitDays: 7 }, now).status,
  'stale',
  '10-day-old exceeds 7-day limit',
);
assert.equal(
  computeFreshness({ lastUpdated: undefined, limitDays: 7 }, now).status,
  'missing',
  'no timestamp → missing',
);

// Tier completeness: every data surface must be scheduled somewhere.
assert.ok(TIERS.daily.includes('historical-append'), 'news archive appender must be daily');
assert.ok(TIERS.monthly.includes('bi-pmi-backfill'), 'PMI backfill must be monthly');
for (const name of TIERS.daily.concat(TIERS.weekly, TIERS.monthly)) {
  assert.ok(typeof name === 'string' && name.length > 0, `tier entry sane: ${name}`);
}

console.log('freshness tests passed');
