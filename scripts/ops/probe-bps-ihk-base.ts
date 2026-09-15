/**
 * scripts/ops/probe-bps-ihk-base.ts — one-off discovery probe (run in CI via
 * .github/workflows/probe-bps-ihk.yml; NEVER locally — BPS WAF blocks this
 * office IP after bursts, and CI holds the real key).
 *
 * Goal: find an IHK (Umum) table covering 2016-2023 (e.g. the 2018=100 base)
 * and check whether var 1 (Inflasi MtM) covers pre-2024, so historical-ihk-
 * trade.json can extend its IHK line back from Jan 2024 to 2016 with real
 * official data (direct table, or chained via official MtM rates).
 *
 * Prints a compact report; never prints the API key.
 */

const BASE = 'https://webapi.bps.go.id/v1/api/list/model';
const KEY = process.env.BPS_API_KEY || '';
if (!KEY) {
  console.log('PROBE_FAIL: no BPS_API_KEY in env');
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ApiJson = Record<string, unknown>;

async function getJson(url: string): Promise<ApiJson> {
  await sleep(1200); // gentle pacing: >=1 req/1.2s
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const txt = await res.text();
  try {
    return JSON.parse(txt) as Record<string, unknown>;
  } catch {
    return { status: 'Error', message: `non-JSON HTTP ${res.status}` };
  }
}

async function listAllIhkVars(): Promise<Array<{ id: number; title: string }>> {
  const hits: Array<{ id: number; title: string }> = [];
  let pages = Infinity;
  for (let page = 1; page <= pages && page <= 200; page++) {
    const j = await getJson(`${BASE}/var/domain/0000/page/${page}/key/${KEY}`);
    if (j.status !== 'OK') {
      console.log(`PROBE_FAIL: var list page ${page}: ${String(j.message).slice(0, 80)}`);
      break;
    }
    const data = j.data as [{ pages: number }?, Array<{ var_id: number; title: string }>?] | undefined;
    const meta = data?.[0];
    if (meta) pages = meta.pages;
    for (const v of data?.[1] || []) {
      const t = String(v.title || '');
      if (/IHK|indeks harga konsumen/i.test(t)) hits.push({ id: v.var_id, title: t });
    }
  }
  return hits;
}

interface ChunkProbe {
  th: string;
  avail: string;
  natKeys: number;
  totalKeys: number;
  sample: string;
}

/** Probe one var over a year chunk; report national-row availability. */
async function probeChunk(varId: number, years: string[], natPrefix: string): Promise<ChunkProbe> {
  const j = await getJson(`${BASE}/data/domain/0000/var/${varId}/th/${years.join(';')}/key/${KEY}`);
  const dc = (j?.datacontent || {}) as Record<string, number>;
  const nat = Object.entries(dc).filter(([k]) => k.startsWith(natPrefix));
  return {
    th: years.join('-'),
    avail: String(j?.['data-availability'] ?? j?.message ?? '?').slice(0, 60),
    natKeys: nat.length,
    totalKeys: Object.keys(dc).length,
    sample: JSON.stringify(nat.slice(0, 2)),
  };
}

async function main() {
  // A. Discover IHK tables.
  const vars = await listAllIhkVars();
  console.log(`IHK_TITLE_MATCHES: ${vars.length}`);
  const umum = vars.filter(
    (v) =>
      /\(umum\)|indeks harga konsumen \(umum\)|2018=100|2012=100|90 kota/i.test(v.title) &&
      !/menurut kelompok/i.test(v.title)
  );
  for (const v of umum) console.log(`  CANDIDATE ${v.id}: ${v.title.slice(0, 110)}`);

  // B. Probe coverage of the strongest candidates (chunked <=3 years).
  //    National key prefixes: var 2 -> '99992', 1709 -> check both, 2245 -> '1512245', var 1 -> '99991'.
  const chunks = [
    ['116', '117', '118'],
    ['119', '120', '121'],
    ['122', '123'],
    ['124', '125', '126'],
  ];
  const candidates = [2, 1709, 2245, ...umum.map((v) => v.id)].filter(
    (id, i, a) => a.indexOf(id) === i
  );
  for (const id of candidates) {
    const prefix = id === 2245 ? '151' : id === 1 ? '99991' : '9999';
    for (const ch of chunks) {
      const r = await probeChunk(id, ch, prefix);
      console.log(`VAR ${id} th ${r.th}: avail=${r.avail} natKeys=${r.natKeys} totalKeys=${r.totalKeys} sample=${r.sample}`);
    }
  }

  // C. var 1 (Inflasi MtM) pre-2024 national coverage (chain fallback).
  for (const ch of chunks.slice(0, 3)) {
    const r = await probeChunk(1, ch, '99991');
    console.log(`VAR 1(MtM) th ${r.th}: avail=${r.avail} natKeys=${r.natKeys} sample=${r.sample}`);
  }

  console.log('PROBE_DONE');
}
main().catch((e) => {
  console.log('PROBE_FAIL:', String(e).slice(0, 150));
  process.exit(1);
});
