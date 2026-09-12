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
import {
  parseTptFromTitle,
  pickLatestTpt,
  pickYearAgoTpt,
  parseSurveyRound,
  brsNationalTptPoints,
} from '../../src/lib/latest-tpt';

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

// ── parseSurveyRound ───────────────────────────────────────────────────────
// Real summary from data/bps/ketenagakerjaan/2026-08.json (released 2026-08-05).
assert.deepEqual(
  parseSurveyRound(
    'Tingkat Pengangguran Terbuka (TPT) sebesar 4,65 persen ; Rata-rata upah buruh sebesar 3,39 juta rupiah.',
    'Jumlah angkatan kerja berdasarkan Survei Angkatan Kerja Nasional (Sakernas) pada Mei 2026 sebanyak 155,41 juta orang.',
  ),
  { observationDate: '2026-05-01', observationLabel: 'Mei 2026' },
  'Mei 2026 round extracted from release summary',
);

// Round headline style (November 2025 release, published 2026-02-05).
assert.deepEqual(
  parseSurveyRound(
    'November 2025: Tingkat Pengangguran Terbuka (TPT) sebesar 4,74 persen.',
    'Jumlah angkatan kerja berdasarkan Survei Angkatan Kerja Nasional (Sakernas) pada November 2025 sebanyak 155,27 juta orang.',
  ),
  { observationDate: '2025-11-01', observationLabel: 'November 2025' },
  'November 2025 round extracted',
);

// No survey month → null.
assert.equal(parseSurveyRound('TPT sebesar 4,65 persen', 'Tanpa penyebutan survei.'), null, 'no round → null');
assert.equal(parseSurveyRound('', ''), null, 'empty texts → null');

// ── brsNationalTptPoints ───────────────────────────────────────────────────
// One point per survey round; a later release revising the same round wins.
assert.deepEqual(
  brsNationalTptPoints([
    { date: '2026-08-05', title: 'TPT sebesar 4,65 persen', summary: '…(Sakernas) pada Mei 2026 sebanyak 155,41 juta orang.' },
    { date: '2026-09-01', title: 'TPT sebesar 4,60 persen', summary: '…(Sakernas) pada Mei 2026 sebanyak 155,00 juta orang (revisi).' },
    { date: '2026-02-05', title: 'TPT sebesar 4,74 persen', summary: '…(Sakernas) pada November 2025 sebanyak 155,27 juta orang.' },
  ]).map((p) => ({ date: p.date, value: p.value, label: p.observationLabel })),
  [
    { date: '2025-11-01', value: 4.74, label: 'November 2025' },
    { date: '2026-05-01', value: 4.6, label: 'Mei 2026' },
  ],
  'dedupe per round, newest release wins, sorted by survey date',
);

assert.deepEqual(brsNationalTptPoints([]), [], 'empty input → empty output');

// ── end-to-end: overlay reaches the historical loader (locks the integration) ──
const { getBPSTptHistoricalData } = require('../../src/lib/data-loader-server');
const hist = getBPSTptHistoricalData();
assert.ok(hist, 'loader returns data');
assert.ok(hist.source.includes('brs_overlay'), `source should include overlay flag, got: ${hist.source}`);
const last = hist.data[hist.data.length - 1];
assert.equal(last.observation_date, '2026-05-01', 'timeline ends at Mei 2026 survey round');
assert.equal(last.tpt, 4.65, 'newest round carries the BRS figure');
assert.ok(hist.data.length >= 61, `no seed rows dropped (have ${hist.data.length}, baseline 61)`);

console.log('latest-tpt tests passed');
