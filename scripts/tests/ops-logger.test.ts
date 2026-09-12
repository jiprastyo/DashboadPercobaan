/**
 * scripts/tests/ops-logger.test.ts
 * Guards the ops-logger item-count extraction.
 *
 * Context: bps-national and bps-provinsi return { source, count }, and the
 * logger's field ladder did not include `count`, so healthy runs were logged
 * as `items_fetched: 0` on /operasional (CI log of weekly run 34067702650:
 * "Successfully fetched and compiled 94 national indicator records" followed
 * by "fetched=0"). This test pins the fixed behaviour.
 *
 * Run: npx tsx scripts/tests/ops-logger.test.ts
 */
import assert from 'node:assert/strict';
import { extractItemCounts } from '../ops/ops-logger';

// bps-national / bps-provinsi shape — the case that was silently reported as 0.
assert.deepEqual(
  extractItemCounts({ source: 'official_api', count: 94 }),
  { fetched: 94, new: 0 },
  'bps-national / bps-provinsi return { source, count }',
);

// kemenaker / bps-html shape.
assert.deepEqual(
  extractItemCounts({ total: 58, newItems: 0 }),
  { fetched: 58, new: 0 },
  'kemenaker returns { total, newItems }',
);

// asean-fallback shape.
assert.deepEqual(
  extractItemCounts({ indicators: 4, totalDataPoints: 1540 }),
  { fetched: 1540, new: 0 },
  'asean-fallback returns { indicators, totalDataPoints }',
);

// bps-html shape (byIndicator is not a number and must be skipped).
assert.deepEqual(
  extractItemCounts({ total: 112, byIndicator: { ihk: 3 } }),
  { fetched: 112, new: 0 },
  'bps-html returns { total, byIndicator }',
);

// bi-pmi returns { total, newItems, count } — total must win over count.
assert.deepEqual(
  extractItemCounts({ total: 12, newItems: 1, count: 12 }),
  { fetched: 12, new: 1 },
  'bi-pmi returns { total, newItems, count }',
);

// Degenerate shapes.
assert.deepEqual(extractItemCounts({}), { fetched: 0, new: 0 }, 'unknown shape');
assert.deepEqual(extractItemCounts(null), { fetched: 0, new: 0 }, 'null result');

// Non-number values must not be coerced into counts.
assert.deepEqual(
  extractItemCounts({ total: 'many', count: '94' }),
  { fetched: 0, new: 0 },
  'string values are not numbers',
);

console.log('ops-logger count tests passed');
