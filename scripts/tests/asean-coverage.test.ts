/**
 * scripts/tests/asean-coverage.test.ts
 * Guards ASEAN fallback data coverage — the failure mode is silent emptiness.
 * Run: npx tsx scripts/tests/asean-coverage.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'data', 'asean', 'fallback');
const summary = JSON.parse(fs.readFileSync(path.join(dir, '_summary.json'), 'utf-8'));

assert.ok(summary.fetchedAt, 'summary has fetchedAt');
const ageDays = (Date.now() - new Date(summary.fetchedAt).getTime()) / 86400000;
assert.ok(ageDays < 40, `fallback data must be <40 days old, is ${ageDays.toFixed(1)}`);

for (const ind of summary.indicators) {
  assert.equal(ind.success, true, `${ind.code} must succeed`);
  assert.ok(ind.dataPoints >= 300, `${ind.code} must carry >=300 points, has ${ind.dataPoints}`);
}

// Latest available year must stay >= 2025 (World Bank publishes with ~1y lag;
// if the max year regresses, the fetch silently broke).
const maxYear = Math.max(
  ...JSON.parse(fs.readFileSync(path.join(dir, 'SL.UEM.TOTL.ZS.json'), 'utf-8')).data.map(
    (r: { date: string }) => Number(r.date),
  ),
);
assert.ok(maxYear >= 2025, `latest year must be >=2025, is ${maxYear}`);

console.log('asean coverage tests passed');
