/**
 * scripts/tests/ihk-chain.test.ts — offline unit test for the 3-table IHK
 * chain in bps-national.ts (mock datacontent maps; NO network, NO key).
 * Verifies level + rate continuity across the 2012/2018/2022 base switches.
 */

import assert from 'assert';
import { buildHistoricalTrade } from '../scrapers/bps-national';

const yid = (y: number) => String(100 + (y % 100));
const key = (vv: string, v: number, y: number, m: number) =>
  `${vv}${v}0${yid(y)}${m}`;

// Synthetic but realistic: exactly 0.3% MtM growth everywhere.
const G = 1.003;

function months(fromY: number, toY: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let y = fromY; y <= toY; y++) for (let m = 1; m <= 12; m++) out.push([y, m]);
  return out;
}

const ihk2: Record<string, number> = {};
months(2016, 2019).forEach(([y, m], i) => {
  ihk2[key('9999', 2, y, m)] = parseFloat((126.98 * Math.pow(G, i)).toFixed(2));
});
const ihk1709: Record<string, number> = {};
months(2020, 2023).forEach(([y, m], i) => {
  ihk1709[key('9999', 1709, y, m)] = parseFloat((102.0 * Math.pow(G, i)).toFixed(2));
});
const ihk2245: Record<string, number> = {};
months(2024, 2026).forEach(([y, m], i) => {
  if (y === 2026 && m > 8) return;
  ihk2245[key('151', 2245, y, m)] = parseFloat((109.75 * Math.pow(G, i)).toFixed(2));
});
const inflasi1: Record<string, number> = {};
months(2016, 2026).forEach(([y, m]) => {
  if (y === 2026 && m > 8) return;
  inflasi1[key('9999', 1, y, m)] = 0.3;
});
const ekspor196: Record<string, number> = {};
const impor497: Record<string, number> = {};
months(2016, 2026).forEach(([y, m], i) => {
  if (y === 2026 && m > 8) return;
  ekspor196[key('9999', 196, y, m)] = 15000 + i;
  impor497[key('9999', 497, y, m)] = 13000 + i;
});

const rows = buildHistoricalTrade(
  ihk2245, ihk2, ihk1709, inflasi1, ekspor196, impor497, 2026
);

const ihk = rows
  .filter((r) => r.indicator === 'ihk')
  .sort((a, b) => a.id.localeCompare(b.id));

// 1. Full coverage 2016-01 .. 2026-08 = 128 months, no gaps.
assert.strictEqual(ihk.length, 128, `expected 128 ihk rows, got ${ihk.length}`);
assert.strictEqual(ihk[0].id, 'ihk-2016-01');
assert.strictEqual(ihk[ihk.length - 1].id, 'ihk-2026-08');
for (let i = 1; i < ihk.length; i++) {
  const [py, pm] = ihk[i - 1].id.slice(4).split('-').map(Number);
  const [y, m] = ihk[i].id.slice(4).split('-').map(Number);
  assert.ok(
    (y === py && m === pm + 1) || (y === py + 1 && pm === 12 && m === 1),
    `gap between ${ihk[i - 1].id} and ${ihk[i].id}`
  );
}

// 2. 2024+ rows equal the direct 2245 values (no accidental rescale).
for (const r of ihk.filter((x) => Number(x.id.slice(4, 8)) >= 2024)) {
  const [y, m] = r.id.slice(4).split('-').map(Number);
  assert.strictEqual(r.value, ihk2245[key('151', 2245, y, m)], `direct mismatch ${r.id}`);
}

// 3. Continuity across BOTH boundaries: chained Dec value must satisfy
//    Dec -> Jan ratio = official 0.3% MtM (level AND rate continuous).
const byId = new Map(ihk.map((r) => [r.id, r]));
for (const decId of ['ihk-2019-12', 'ihk-2023-12']) {
  const janId = decId.replace(/12$/, '').replace(/-(\d{4})-$/, (_, y) => `-${Number(y) + 1}-01`);
  const dec = byId.get(decId)!;
  const jan = byId.get(janId)!;
  const ratio = (jan.value - dec.value) / dec.value * 100;
  assert.ok(
    Math.abs(ratio - 0.3) <= 0.02,
    `${decId}->${janId} boundary ratio ${ratio.toFixed(3)}% not ~0.3%`
  );
}

// 4. change_mom everywhere equals the official 0.3 (from var 1).
for (const r of ihk) {
  assert.strictEqual(r.change_mom, 0.3, `change_mom missing/wrong on ${r.id}`);
}

// 5. YoY ≈ (1.003^12 - 1)*100 ≈ 3.66% everywhere inside coverage.
const expectedYoy = (Math.pow(G, 12) - 1) * 100;
for (const r of ihk) {
  if (r.change_yoy === undefined) continue;
  assert.ok(
    Math.abs(r.change_yoy - expectedYoy) <= 0.05,
    `yoy drift on ${r.id}: ${r.change_yoy} vs ${expectedYoy.toFixed(2)}`
  );
}
const withYoy = ihk.filter((r) => r.change_yoy !== undefined).length;
assert.ok(withYoy >= 88, `too few yoy values: ${withYoy}`);

// 6. Ekspor/impor full 2016->now coverage with USD conversion intact.
const ex = rows.filter((r) => r.indicator === 'ekspor');
assert.strictEqual(ex.length, 128);
assert.strictEqual(ex.find((r) => r.id === 'ekspor-2016-01')!.value, 15000 * 1e6);

console.log('ihk-chain tests passed');
