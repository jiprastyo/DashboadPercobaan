/**
 * scripts/tests/latest-tpt.test.ts
 * Guards the TPT headline extraction from BPS press releases.
 *
 * Context: the overview dashboard shows TPT from the February provincial
 * survey (tpt_feb_26 = 4.68) even when BPS has published a newer figure in a
 * press release captured daily by the BRS scraper (e.g. "TPT sebesar 4,65
 * persen", 2026-08-05, sitting in data/bps/ketenagakerjaan/*.json). This test
 * pins the parser that surfaces the newest figure.
 *
 * Run: npx tsx scripts/tests/latest-tpt.test.ts
 */
import assert from 'node:assert/strict';
import { parseTptFromTitle, pickLatestTpt, pickYearAgoTpt } from '../../src/lib/latest-tpt';

// ── parseTptFromTitle ─────────────────────────────────────────────────────
// Real title from data/bps/ketenagakerjaan/2026-08.json (2026-08-05).
assert.equal(
  parseTptFromTitle(
    'Tingkat Pengangguran Terbuka (TPT) sebesar 4,65 persen ; Rata-rata upah buruh sebesar 3,39',
  ),
  4.65,
  'comma-decimal real-world title',
);

// Dot-decimal variant.
assert.equal(parseTptFromTitle('TPT sebesar 4.68 persen'), 4.68, 'dot-decimal');

// Older real-world title with different phrasing (2026-05 release).
assert.equal(
  parseTptFromTitle(
    'Tingkat Pengangguran Terbuka (TPT) sebesar 4,82 persen pada Februari 2026',
  ),
  4.82,
  'May 2026 release phrasing',
);

// No TPT figure → null (must not parse unrelated percentages).
assert.equal(parseTptFromTitle('Rata-rata upah buruh sebesar 3,39'), null, 'no TPT → null');
assert.equal(parseTptFromTitle(''), null, 'empty title → null');

// Must not grab a wage figure when TPT appears after it.
assert.equal(
  parseTptFromTitle('Upah 3,39 persen naik; TPT sebesar 4,65 persen'),
  4.65,
  'TPT figure wins over earlier wage figure',
);

// ── pickLatestTpt ──────────────────────────────────────────────────────────
// Newest date wins regardless of input order.
assert.deepEqual(
  pickLatestTpt([
    { date: '2026-05-07', title: 'TPT sebesar 4,82 persen' },
    { date: '2026-08-05', title: 'TPT sebesar 4,65 persen' },
  ]),
  { value: 4.65, date: '2026-08-05' },
  'newest release wins',
);

// Wage-only releases are skipped entirely.
assert.equal(
  pickLatestTpt([{ date: '2026-08-05', title: 'Rata-rata upah buruh naik' }]),
  null,
  'non-TPT releases skipped',
);

// Empty input → null.
assert.equal(pickLatestTpt([]), null, 'empty input → null');

// ── pickYearAgoTpt ──────────────────────────────────────────────────────────
// Same-vintage YoY: the newest release 10-13 months before the reference date.
assert.equal(
  pickYearAgoTpt(
    [
      { date: '2026-08-05', title: 'TPT sebesar 4,65 persen' },
      { date: '2025-08-07', title: 'TPT sebesar 4,91 persen' },
      { date: '2025-11-05', title: 'TPT sebesar 4,85 persen' },
    ],
    '2026-08-05',
  )?.value,
  4.91,
  'release ~12 months earlier wins over ~9 months earlier',
);

// No release in the 10-13 month window → null (badge must hide, not blend vintages).
assert.equal(
  pickYearAgoTpt(
    [
      { date: '2026-08-05', title: 'TPT sebesar 4,65 persen' },
      { date: '2025-11-05', title: 'TPT sebesar 4,85 persen' }, // only ~9 months before
    ],
    '2026-08-05',
  ),
  null,
  'no same-vintage year-ago release → null',
);

assert.equal(pickYearAgoTpt([], '2026-08-05'), null, 'empty input → null');

console.log('latest-tpt tests passed');
