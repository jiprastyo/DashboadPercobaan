/**
 * scripts/tests/benchmark-targets.test.ts — offline guard for the RPJMN TPT
 * target bands in data/benchmarks/targets.json + their loader passthrough.
 * No network. See docs/RPJMN_TPT_TARGETS.md for the citation recipe.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

// CommonJS require: same integration pattern as scripts/tests/latest-tpt.test.ts
// (src/lib modules are plain Node, no bundler aliases needed).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getBenchmarkTargets } = require('../../src/lib/data-loader-server') as {
  getBenchmarkTargets: () => Array<{
    id: string;
    indicator: string;
    scope: string;
    valueMin: number;
    valueMax: number;
    periodStart?: string;
    periodEnd?: string;
    computed: boolean;
    sourceUrl: string;
  }>;
};

const raw = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data/benchmarks/targets.json'), 'utf-8')
) as {
  targets: Array<{
    id: string;
    indicator: string;
    scope: string;
    value_min: number | null;
    value_max: number | null;
    period_start?: string;
    period_end?: string;
    _source_url?: string;
  }>;
};

// 1. Every rpjmn-tpt-* entry carries an ISO administration window and a real URL.
const rpjmn = raw.targets.filter((t) => t.id.startsWith('rpjmn-tpt-'));
assert.ok(rpjmn.length >= 5, `expected >=5 rpjmn tpt bands, got ${rpjmn.length}`);
for (const t of rpjmn) {
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(t.period_start ?? ''), `${t.id} missing period_start`);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(t.period_end ?? ''), `${t.id} missing period_end`);
  assert.ok(/^https?:\/\//.test(t._source_url ?? ''), `${t.id} missing real _source_url`);
  assert.ok(t.value_min !== null && t.value_max !== null, `${t.id} missing band bounds`);
}

// 2. Windows are ordered and non-overlapping (bands must not float over the
//    wrong administration's years).
const windows = rpjmn
  .map((t) => ({ id: t.id, start: Date.parse(t.period_start!), end: Date.parse(t.period_end!) }))
  .sort((a, b) => a.start - b.start);
for (let i = 1; i < windows.length; i++) {
  assert.ok(
    windows[i].start > windows[i - 1].end,
    `windows overlap: ${windows[i - 1].id} vs ${windows[i].id}`
  );
}

// 3. Loader resolves exactly these bands (sentinels still skipped) and keeps
//    periodStart/periodEnd in the passthrough.
const nationalTpt = getBenchmarkTargets().filter(
  (t) => t.indicator === 'tpt' && t.scope === 'national' && !t.computed
);
assert.strictEqual(nationalTpt.length, rpjmn.length, 'loader dropped/added rpjmn bands');
for (const t of nationalTpt) {
  assert.ok(t.periodStart && t.periodEnd, `${t.id} lost period window in loader`);
  assert.ok(t.sourceUrl.startsWith('http'), `${t.id} lost source URL`);
}

// 4. Sanity on magnitudes: all targets inside 3-7% (TPT has never been outside
//    that band in the official RPJMN texts; catches typos like 41.0 for 4,1).
for (const t of rpjmn) {
  assert.ok(
    (t.value_min! >= 3 && t.value_max! <= 7),
    `${t.id} band ${t.value_min}-${t.value_max} outside plausible 3-7%`
  );
}

console.log('benchmark-targets tests passed');
