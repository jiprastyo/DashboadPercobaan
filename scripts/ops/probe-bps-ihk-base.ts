/**
 * scripts/ops/probe-bps-ihk-base.ts — one-off discovery probe (CI only).
 * Confirms the 3-table IHK chain: var 2 (2012=100, 2016-2019) ->
 * var 1709 (2018=100, 2020-2023) -> var 2245 (2022=100, 2024-now),
 * with official var 1 MtM inflation (2016-now) as the cross-check.
 */
const BASE = 'https://webapi.bps.go.id/v1/api/list/model';
const KEY = process.env.BPS_API_KEY || '';
if (!KEY) { console.log('PROBE_FAIL: no BPS_API_KEY'); process.exit(1); }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ApiJson = Record<string, unknown>;
async function getJson(url: string): Promise<ApiJson> {
  await sleep(1500);
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const txt = await res.text();
  try { return JSON.parse(txt) as ApiJson; }
  catch { return { status: 'Error', message: `non-JSON HTTP ${res.status}` }; }
}

async function main() {
  // Full national (9999 / 151) monthly series per table
  const specs = [
    { id: 2, prefix: '99992', th: '116;117;118' },
    { id: 2, prefix: '99992', th: '119;120' },
    { id: 1709, prefix: '99991709', th: '119;120;121' },
    { id: 1709, prefix: '99991709', th: '122;123' },
    { id: 2245, prefix: '1512245', th: '124' },
    { id: 1, prefix: '999910', th: '119;120' },
  ];
  for (const s of specs) {
    const j = await getJson(`${BASE}/data/domain/0000/var/${s.id}/th/${s.th}/key/${KEY}`);
    const dc = (j.datacontent || {}) as Record<string, number>;
    const nat = Object.entries(dc).filter(([k]) => k.startsWith(s.prefix) && k.length <= s.prefix.length + 4);
    nat.sort((a, b) => a[0].localeCompare(b[0]));
    console.log(`CHAIN var ${s.id} th ${s.th}: avail=${j['data-availability']} nat=${JSON.stringify(nat)}`);
  }
  console.log('PROBE_DONE');
}
main().catch((e) => { console.log('PROBE_FAIL:', String(e).slice(0, 150)); process.exit(1); });
