/**
 * scripts/scrapers/asean-tiered.ts — ASEAN labour-market data, tiered fallback.
 *
 * Replaces the old one-shot World Bank pull (asean-fallback.ts) with a cascade:
 *
 *   tier 1  national statistics offices (official survey/census figures)
 *           MYS api.data.gov.my (DOSM) · SGP TableBuilder+data.gov.sg (SingStat/MOM)
 *           PHL openstat.psa.gov.ph (PSA LFS)
 *   tier 2  World Bank API — "modeled ILO estimate" (harmonised, NOT official survey)
 *   tier 3  Our World In Data grapher CSVs — same ILO modeled estimates, mirror
 *   tier 4  last good data already committed in the repo (keeps charts alive
 *           when every network source fails; never fabricates)
 *
 * Every value carries its own provenance so the UI can label modeled numbers:
 *   kind: 'official' | 'modeled' | 'derived' | 'archive'
 *
 * Merge rule per (country, indicator, year): first tier that answers wins.
 * Indonesia is deliberately NOT harvested here — BPS stays the primary for IDN
 * via getASEANComparableData's read-time overlay in data-loader-server.ts.
 *
 * Outputs the UI file data/asean/fallback/_by_country.json (same shape plus
 * provenance fields) and a raw tier dump data/asean/tiered/.
 *
 * Run: npx tsx scripts/scrapers/asean-tiered.ts
 */

import fs from 'fs';
import path from 'path';
import {
  WORLD_BANK,
  fetchWithRetry,
  log,
  timestamp,
  writeJSON,
  ensureDir,
  delay,
  RATE_LIMIT,
  DATA_DIR,
} from '../config';

// ─── Types ───────────────────────────────────────────────────────────────────
export type ProvenanceKind = 'official' | 'modeled' | 'derived' | 'archive';

export interface Provenance {
  tier: 1 | 2 | 3 | 4;
  kind: ProvenanceKind;
  source: string; // short id, e.g. 'dosm', 'worldbank', 'owid', 'archive'
  sourceName: string; // human label for legend/caption
  sourceUrl: string;
  note?: string;
}

export interface AseanSeriesValue {
  year: string;
  value: number | null;
  kind: ProvenanceKind;
  source: string;
}

export interface AseanSeries {
  name: string;
  values: AseanSeriesValue[];
}

export interface AseanCountrySeries {
  countryCode: string; // WB ISO2 ('MY'), like the legacy file
  countryName: string; // WB name, like the legacy file (UI matches on this)
  iso3: string;
  indicators: Record<string, AseanSeries>;
}

export interface AseanTieredFile {
  countries: AseanCountrySeries[];
  provenance: Record<string, Provenance>; // keyed by tiered source id
  indicatorProvenance: Record<string, Record<string, string>>; // iso3 -> indicatorCode -> source id
  _source_url: string;
  _scraped_at: string;
}

interface IndicatorDef {
  code: string; // canonical (WB) code, keeps UI keys stable
  name: string;
  aliases: string[]; // names used by other tiers
}

const INDICATORS: IndicatorDef[] = [
  { code: 'SL.UEM.TOTL.ZS', name: 'Unemployment rate (%)', aliases: ['u_rate'] },
  { code: 'SL.TLF.CACT.ZS', name: 'Labor force participation rate (%)', aliases: ['p_rate'] },
  { code: 'SL.EMP.TOTL.SP.ZS', name: 'Employment to population ratio (%)', aliases: ['ep_ratio'] },
  { code: 'SL.UEM.1524.ZS', name: 'Youth unemployment rate (%)', aliases: [] },
];

// Countries we harvest. Indonesia's WB/OWID modeled rows are kept ONLY for the
// overview snapshot compatibility (the makro-asean page replaces IDN with BPS
// at read time via getASEANComparableData).
const TIER1_COUNTRIES = ['MYS', 'SGP', 'PHL'];
// Single source of truth: ISO2 strings are DERIVED from the ISO3 list so the
// two can never diverge (review nit 2026-09-16).
const WB_ISO2: Record<string, string> = { IDN: 'ID', MYS: 'MY', THA: 'TH', PHL: 'PH', VNM: 'VN', SGP: 'SG', MMR: 'MM', KHM: 'KH', LAO: 'LA', BRN: 'BN', TLS: 'TL' };
const MODELED_ISO3_LIST = ['IDN', 'MYS', 'THA', 'PHL', 'VNM', 'SGP', 'MMR', 'KHM', 'LAO', 'BRN', 'TLS'];
const MODELED_COUNTRIES_ISO2 = MODELED_ISO3_LIST.map((k) => WB_ISO2[k]).join(';');
const MODELED_COUNTRIES_ISO3 = MODELED_ISO3_LIST.join(';');

const ISO3_TO_NAME: Record<string, string> = {
  IDN: 'Indonesia',
  MYS: 'Malaysia', THA: 'Thailand', PHL: 'Philippines', VNM: 'Viet Nam',
  SGP: 'Singapore', MMR: 'Myanmar', KHM: 'Cambodia', LAO: 'Lao PDR',
  BRN: 'Brunei Darussalam', TLS: 'Timor-Leste',
};
const NAME_TO_ISO3: Record<string, string> = Object.entries(ISO3_TO_NAME)
  .reduce((acc, [iso3, name]) => { acc[name.toLowerCase()] = iso3; return acc; }, {} as Record<string, string>);
NAME_TO_ISO3['vietnam'] = 'VNM';
NAME_TO_ISO3['lao people democratic republic'] = 'LAO';
NAME_TO_ISO3['laos'] = 'LAO';
NAME_TO_ISO3['brunei'] = 'BRN';
NAME_TO_ISO3['philippines (republic of the)'] = 'PHL';

export const ASEAN_PROVENANCE: Record<string, Provenance> = {
  dosm:       { tier: 1, kind: 'official', source: 'dosm', sourceName: 'DOSM Malaysia (Labour Force Statistics, official monthly release)', sourceUrl: 'https://api.data.gov.my/data-catalogue?id=lfs_month' },
  singstat:   { tier: 1, kind: 'official', source: 'singstat', sourceName: 'SingStat TableBuilder / MOM (official quarterly release)', sourceUrl: 'https://tablebuilder.singstat.gov.sg' },
  psa:        { tier: 1, kind: 'official', source: 'psa', sourceName: 'PSA Philippines OpenSTAT (Labor Force Survey, official)', sourceUrl: 'https://openstat.psa.gov.ph' },
  worldbank:  { tier: 2, kind: 'modeled', source: 'worldbank', sourceName: 'World Bank / ILO modeled estimate', sourceUrl: 'https://api.worldbank.org/v2', note: 'Modeled ILO estimate — harmonised across countries, not a national survey figure.' },
  owid:       { tier: 3, kind: 'modeled', source: 'owid', sourceName: 'Our World in Data (ILO modeled estimates)', sourceUrl: 'https://ourworldindata.org', note: 'Mirror of ILO modeled estimates — not a national survey figure.' },
  archive:    { tier: 4, kind: 'archive', source: 'archive', sourceName: 'Repo archive (last good run)', sourceUrl: '', note: 'All network sources failed; values are from the last successful fetch. Re-run when sources recover.' },
};

// ─── Shared year buckets (calendar-year averaging) ──────────────────────────
export type Buckets = Map<string, { sum: number; n: number }>;

export function addPoint(buckets: Buckets, date: string, raw: number | null): void {
  const year = String(date).slice(0, 4);
  if (!/^\d{4}$/.test(year) || raw === null || raw === undefined || Number.isNaN(raw)) return;
  const cur = buckets.get(year) || { sum: 0, n: 0 };
  cur.sum += raw;
  cur.n += 1;
  buckets.set(year, cur);
}

export function finalize(buckets: Buckets, kind: ProvenanceKind = 'official'): AseanSeriesValue[] {
  return [...buckets.entries()]
    .filter(([, b]) => b.n > 0)
    .map(([year, b]) => ({
      year,
      value: Number((b.sum / b.n).toFixed(3)),
      kind,
      source: '',
    }));
}

// ─── Tier 1a: Malaysia (DOSM via api.data.gov.my) ───────────────────────────
const MY_FIELD_TO_CODE: Record<string, string> = {
  u_rate: 'SL.UEM.TOTL.ZS',
  p_rate: 'SL.TLF.CACT.ZS',
  ep_ratio: 'SL.EMP.TOTL.SP.ZS',
};

export function parseMalaysia(json: unknown): Record<string, Buckets> | null {
  if (!Array.isArray(json)) return null;
  const out: Record<string, Buckets> = {};
  for (const entry of json as Array<Record<string, unknown>>) {
    if (typeof entry !== 'object' || entry === null) continue;
    for (const [field, code] of Object.entries(MY_FIELD_TO_CODE)) {
      const v = entry[field];
      if (typeof v !== 'number') continue;
      out[code] = out[code] || new Map();
      addPoint(out[code], String(entry.date ?? ''), v);
    }
  }
  return Object.keys(out).length ? out : null;
}

async function fetchMalaysia(): Promise<Record<string, Buckets> | null> {
  try {
    const res = await fetchWithRetry('https://api.data.gov.my/data-catalogue?id=lfs_month', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) { log('asean-tiered', `MYS HTTP ${res.status}`); return null; }
    const parsed = parseMalaysia(await res.json());
    if (parsed) log('asean-tiered', 'MYS: DOSM official monthly LFS ok');
    return parsed;
  } catch (err) {
    log('asean-tiered', `MYS error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// ─── Tier 1b: Singapore (SingStat TableBuilder + data.gov.sg) ───────────────
const SG_TB_URL = 'https://tablebuilder.singstat.gov.sg/api/table/tabledata/M182341?limit=20000';
const SG_DGS_URL = 'https://data.gov.sg/api/action/datastore_search?resource_id=d_b816a930bca0eb19fdf20fcbfcdd4c39&limit=5000';
const SG_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', Accept: 'application/json' };

// TableBuilder quarterly columns '2026 2Q' → calendar-year averages (verified shape 2026-09-16).
export function parseSingstatTable(json: unknown): Buckets | null {
  const rows = (json as { Data?: { row?: Array<{ rowText?: string; columns?: Array<{ key: string; value: string }> }> } })?.Data?.row;
  if (!Array.isArray(rows)) return null;
  const total = rows.find((r) => /total unemployment rate/i.test(r.rowText || ''));
  if (!total?.columns) return null;
  const out: Buckets = new Map();
  for (const c of total.columns) {
    const m = /^(\d{4})\s*([1-4])Q$/.exec(c.key || '');
    if (!m) continue;
    const v = Number(c.value);
    if (Number.isNaN(v)) continue;
    addPoint(out, m[1], v); // averaged over the quarters present that year
  }
  return out.size ? out : null;
}

// data.gov.sg datastore: numeric columns like '20262Q' (verified 2026-09-16).
export function parseSingstatDgs(json: unknown): Buckets | null {
  const records = (json as { result?: { records?: Array<Record<string, string | number>> } })?.result?.records;
  if (!Array.isArray(records)) return null;
  const row = records.find((r) => /total unemployment rate/i.test(String(r.DataSeries ?? ''))) || records[0];
  if (!row) return null;
  const out: Buckets = new Map();
  for (const [key, v] of Object.entries(row)) {
    const m = /^(\d{4})([1-4])Q$/.exec(key);
    if (!m) continue;
    const num = Number(v);
    if (Number.isNaN(num)) continue;
    addPoint(out, m[1], num);
  }
  return out.size ? out : null;
}

async function fetchSingapore(): Promise<Buckets | null> {
  for (const [url, parse, id] of [
    [SG_TB_URL, parseSingstatTable, 'tablebuilder'],
    [SG_DGS_URL, parseSingstatDgs, 'data.gov.sg'],
  ] as const) {
    try {
      const res = await fetchWithRetry(url, { headers: SG_HEADERS });
      if (!res.ok) { log('asean-tiered', `SGP ${id} HTTP ${res.status}`); continue; }
      const parsed = parse(await res.json());
      if (parsed && parsed.size) { log('asean-tiered', `SGP: SingStat official (${id}) ok`); return parsed; }
    } catch (err) {
      log('asean-tiered', `SGP ${id} error: ${err instanceof Error ? err.message : err}`);
    }
  }
  return null;
}

// ─── Tier 1c: Philippines (PSA OpenSTAT PXWeb) ──────────────────────────────
const PHL_BASE = 'https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/1B/LFS/0021B3FKEI2.px';
// On this server PXWeb rejects non-empty POST queries (404) but returns the
// FULL table for POST {"query":[],"response":{"format":"json"}} — verified 2026-09-16.
// Rate valueTexts map to canonical codes dynamically (see parsePhilippines).

interface PxFull {
  columns?: Array<{ code: string; text: string }>;
  data?: Array<{ key: string[]; values: string[] }>;
}

export function parsePhilippines(
  meta: { variables?: Array<{ code: string; values: string[]; valueTexts: string[] }> },
  full: PxFull,
): Record<string, Buckets> {
  const out: Record<string, Buckets> = {};
  const byCode: Record<string, { code: string; values: string[]; valueTexts: string[] }> = {};
  for (const v of meta.variables || []) byCode[v.code] = v;
  const yearT = byCode.Year, monthT = byCode.Month, ratesT = byCode.Rates, sexT = byCode.Sex;
  if (!yearT || !monthT || !ratesT || !sexT || !Array.isArray(full.data)) return out;

  const codeToIndicator: Record<string, string> = {};
  ratesT.valueTexts.forEach((t, i) => {
    const code = ratesT.values[i];
    if (/participation/i.test(t)) codeToIndicator[code] = 'SL.TLF.CACT.ZS';
    else if (/unemployment/i.test(t)) codeToIndicator[code] = 'SL.UEM.TOTL.ZS';
    // PSA's "Employment Rate" here is share-of-labor-force (≈ 100 − unemployment),
    // NOT the employment-to-population ratio — do NOT map it to SL.EMP.TOTL.SP.ZS.
    // EPR is instead derived exactly from the two official rates below, the same
    // convention data-loader uses for Indonesia's BPS EPR. Verified 2026-09-16:
    // mapping "Employment Rate" gave 95.8% vs the modeled 66.4% for 2025.
  });
  const annualCode = monthT.values[monthT.valueTexts.findIndex((t) => /^annual$/i.test(t))];
  const bothSexCode = sexT.values[sexT.valueTexts.findIndex((t) => /both/i.test(t))];
  if (!annualCode || !bothSexCode) return out;

  for (const row of full.data) {
    const [yearCode, monthCode, ratesCode, sexCode] = row.key;
    if (monthCode !== annualCode || sexCode !== bothSexCode) continue;
    const indicator = codeToIndicator[ratesCode];
    if (!indicator) continue;
    const year = yearT.valueTexts[yearT.values.indexOf(yearCode)];
    if (!year || !/^\d{4}$/.test(year)) continue;
    const raw = (row.values[0] || '').trim();
    if (!raw || raw === '.') continue;
    const v = Number(raw.replace(/\s/g, ''));
    if (Number.isNaN(v)) continue;
    out[indicator] = out[indicator] || new Map();
    addPoint(out[indicator], year, v);
  }

  // Derive EPR = LFPR × (1 − unemployment/100) from the official annual rates.
  const lfprB = out['SL.TLF.CACT.ZS'];
  const ueB = out['SL.UEM.TOTL.ZS'];
  if (lfprB && ueB) {
    const epB: Buckets = new Map();
    for (const [year, lf] of lfprB) {
      const ue = ueB.get(year);
      if (!ue || !lf.n || !ue.n) continue;
      const ep = (lf.sum / lf.n) * (1 - ue.sum / ue.n / 100);
      epB.set(year, { sum: Number(ep.toFixed(3)), n: 1 });
    }
    if (epB.size) out['SL.EMP.TOTL.SP.ZS'] = epB;
  }
  return out;
}

async function fetchPhilippines(): Promise<Record<string, Buckets> | null> {
  try {
    const metaRes = await fetchWithRetry(`${PHL_BASE}?format=json`, { headers: { Accept: 'application/json' } });
    if (!metaRes.ok) { log('asean-tiered', `PHL meta HTTP ${metaRes.status}`); return null; }
    const meta = await metaRes.json() as { variables?: Array<{ code: string; values: string[]; valueTexts: string[] }> };
    const dataRes = await fetchWithRetry(PHL_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: [], response: { format: 'json' } }),
    });
    if (!dataRes.ok) { log('asean-tiered', `PHL data HTTP ${dataRes.status}`); return null; }
    const body = await dataRes.json() as PxFull;
    const out = parsePhilippines(meta, body);
    for (const [code, b] of Object.entries(out)) log('asean-tiered', `PHL: PSA LFS ${code} ${b.size} yrs ok`);
    return Object.keys(out).length ? out : null;
  } catch (err) {
    log('asean-tiered', `PHL error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// ─── Tier 2: World Bank (modeled ILO estimates) ─────────────────────────────
export function parseWorldBank(json: unknown): Record<string, Record<string, AseanSeriesValue[]>> | null {
  if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) return null;
  const out: Record<string, Record<string, AseanSeriesValue[]>> = {};
  for (const entry of json[1] as Array<{ country: { id: string; value: string }; indicator: { id: string }; date: string; value: number | null }>) {
    if (entry.value === null || entry.value === undefined) continue;
    const key = iso2ToIso3(String(entry.country?.id || ''));
    if (!ISO3_TO_NAME[key]) continue;
    out[key] = out[key] || {};
    out[key][entry.indicator.id] = out[key][entry.indicator.id] || [];
    out[key][entry.indicator.id].push({
      year: entry.date,
      value: Number(entry.value),
      kind: 'modeled',
      source: 'worldbank',
    });
  }
  return Object.keys(out).length ? out : null;
}

function iso2ToIso3(iso2: string): string {
  const map: Record<string, string> = { MY: 'MYS', TH: 'THA', PH: 'PHL', VN: 'VNM', SG: 'SGP', MM: 'MMR', KH: 'KHM', LA: 'LAO', BN: 'BRN', TL: 'TLS', ID: 'IDN' };
  return map[iso2] || iso2;
}

async function fetchWorldBank(): Promise<Record<string, Record<string, AseanSeriesValue[]>> | null> {
  // NOTE: the WB v2 API only accepts a ';' list for country OR indicator, not
  // both at once (HTTP 200 with error body 120) — probe per indicator instead,
  // the same way asean-fallback.ts does.
  const out: Record<string, Record<string, AseanSeriesValue[]>> = {};
  let any = false;
  for (const ind of INDICATORS) {
    try {
      const url = `${WORLD_BANK.baseUrl}/country/${MODELED_COUNTRIES_ISO2}/indicator/${ind.code}?format=json&date=${WORLD_BANK.dateRange}&per_page=${WORLD_BANK.perPage}`;
      const res = await fetchWithRetry(url);
      if (!res.ok) { log('asean-tiered', `WB ${ind.code} HTTP ${res.status}`); continue; }
      const parsed = parseWorldBank(await res.json());
      if (!parsed) continue;
      for (const [iso3, inds] of Object.entries(parsed)) {
        out[iso3] = out[iso3] || {};
        for (const [code, vals] of Object.entries(inds)) {
          out[iso3][code] = vals;
          any = true;
        }
      }
    } catch (err) {
      log('asean-tiered', `WB ${ind.code} error: ${err instanceof Error ? err.message : err}`);
    }
    await delay(500);
  }
  if (any) log('asean-tiered', 'WB: modeled ILO estimates ok');
  return any ? out : null;
}

// ─── Tier 3: Our World In Data (mirror of ILO modeled estimates) ────────────
const OWID_GRAPHERS: Array<[string, string]> = [
  ['unemployment-rate', 'SL.UEM.TOTL.ZS'],
  ['labor-force-participation-rate', 'SL.TLF.CACT.ZS'],
  ['employment-to-population-ratio', 'SL.EMP.TOTL.SP.ZS'],
];

export function parseOwidCsv(text: string): Record<string, AseanSeriesValue[]> {
  const out: Record<string, AseanSeriesValue[]> = {};
  const lines = text.split('\n');
  if (lines.length < 2) return out;
  const header = (lines[0] || '').split(',');
  const codeIdx = header.indexOf('Code');
  const yearIdx = header.indexOf('Year');
  // Grapher CSVs are single-indicator by convention: Entity,Code,Year,<value>
  // (+ optional Day). Anchor on position 3 so a renamed value column still
  // parses, while an inserted extra column shows up as non-numeric rows
  // (Number() guard) rather than silent garbage.
  const valIdx = 3;
  if (codeIdx < 0 || yearIdx < 0 || header.length < 4) return out;
  for (let i = 1; i < lines.length; i++) {
    const cols = (lines[i] || '').split(',');
    const iso3 = cols[codeIdx];
    if (!ISO3_TO_NAME[iso3]) continue;
    const v = Number(cols[valIdx]);
    if (!/^\d{4}$/.test(cols[yearIdx]) || Number.isNaN(v)) continue;
    out[iso3] = out[iso3] || [];
    out[iso3].push({ year: cols[yearIdx], value: v, kind: 'modeled', source: 'owid' });
  }
  return out;
}

async function fetchOwid(): Promise<Record<string, Record<string, AseanSeriesValue[]>> | null> {
  const out: Record<string, Record<string, AseanSeriesValue[]>> = {};
  let any = false;
  for (const [grapher, code] of OWID_GRAPHERS) {
    try {
      const res = await fetchWithRetry(`https://ourworldindata.org/grapher/${grapher}.csv`, {
        headers: { Accept: 'text/csv' },
      });
      if (!res.ok) { log('asean-tiered', `OWID ${grapher} HTTP ${res.status}`); continue; }
      const perCountry = parseOwidCsv(await res.text());
      for (const [iso3, vals] of Object.entries(perCountry)) {
        out[iso3] = out[iso3] || {};
        out[iso3][code] = vals;
        any = true;
      }
    } catch (err) {
      log('asean-tiered', `OWID ${grapher} error: ${err instanceof Error ? err.message : err}`);
    }
    await delay(400);
  }
  if (any) log('asean-tiered', 'OWID: modeled-estimate mirror ok');
  return any ? out : null;
}

// ─── Merge: first answering tier wins per (country, indicator, year) ────────
export function buildMerged(
  tier1: Record<string, Record<string, Buckets>>, // iso3 -> indicator -> buckets
  tier2: Record<string, Record<string, AseanSeriesValue[]>> | null,
  tier3: Record<string, Record<string, AseanSeriesValue[]>> | null,
): { countries: AseanCountrySeries[]; indicatorProvenance: Record<string, Record<string, string>> } {
  const iso3s = [...new Set([...TIER1_COUNTRIES, ...MODELED_COUNTRIES_ISO3.split(';')])];
  const countries: AseanCountrySeries[] = [];
  const ip: Record<string, Record<string, string>> = {};

  for (const iso3 of iso3s) {
    const entry: AseanCountrySeries = {
      countryCode: WB_ISO2[iso3] || iso3,
      countryName: ISO3_TO_NAME[iso3] || iso3,
      iso3,
      indicators: {},
    };
    ip[iso3] = {};
    for (const ind of INDICATORS) {
      const byYear = new Map<string, AseanSeriesValue>();
      const t1 = tier1[iso3]?.[ind.code];
      if (t1 && t1.size) {
        // PSA EPR is derived from two official rates → kind 'derived', matching
        // how Indonesia's BPS-derived EPR is labelled at read time.
        const t1kind: ProvenanceKind = iso3 === 'PHL' && ind.code === 'SL.EMP.TOTL.SP.ZS' ? 'derived' : 'official';
        for (const v of finalize(t1, t1kind)) {
          v.source = tier1SourceId(iso3);
          byYear.set(v.year, v);
        }
        ip[iso3][ind.code] = tier1SourceId(iso3);
      }
      for (const tier of [tier2, tier3]) {
        const vals = tier?.[iso3]?.[ind.code];
        if (!vals?.length) continue;
        for (const v of vals) {
          if (!byYear.has(v.year)) byYear.set(v.year, v);
        }
        if (!ip[iso3][ind.code]) ip[iso3][ind.code] = vals[0].source;
      }
      if (!byYear.size) continue;
      entry.indicators[ind.code] = {
        name: ind.name,
        values: [...byYear.values()].sort((a, b) => Number(a.year) - Number(b.year)),
      };
    }
    if (Object.keys(entry.indicators).length) countries.push(entry);
  }
  return { countries, indicatorProvenance: ip };
}

function tier1SourceId(iso3: string): string {
  return { MYS: 'dosm', SGP: 'singstat', PHL: 'psa' }[iso3] || 'official';
}

// ─── Archive (tier 4): last good committed file ─────────────────────────────
// Preference order: our OWN provenance-tagged snapshot (written on every
// successful run) → the legacy UI file. The snapshot exists so a failing
// same-night `asean-fallback` run cannot erase the archive tier reads from.
export function readArchive(): { countries: AseanCountrySeries[] } | null {
  const candidates = [
    path.join(DATA_DIR, 'asean', 'tiered', '_archive.json'),
    path.join(WORLD_BANK.dataDir, '_by_country.json'),
  ];
  for (const uiPath of candidates) {
    const parsed = readArchiveFile(uiPath);
    if (parsed) return parsed;
  }
  return null;
}

function readArchiveFile(uiPath: string): { countries: AseanCountrySeries[] } | null {
  try {
    if (!fs.existsSync(uiPath)) return null;
    const j = JSON.parse(fs.readFileSync(uiPath, 'utf-8')) as {
      countries?: Array<{ countryCode: string; countryName: string; indicators?: Record<string, { name: string; values: Array<{ year: string; value: number | null }> }> }>;
    };
    if (!j?.countries?.length) return null;
    const countries: AseanCountrySeries[] = [];
    for (const c of j.countries) {
      const iso3 = Object.keys(ISO3_TO_NAME).find((k) => WB_ISO2[k] === c.countryCode)
        || NAME_TO_ISO3[(c.countryName || '').toLowerCase()];
      if (!iso3) continue;
      const entry: AseanCountrySeries = { countryCode: c.countryCode, countryName: c.countryName, iso3, indicators: {} };
      for (const [code, ind] of Object.entries(c.indicators || {})) {
        entry.indicators[code] = {
          name: ind.name,
          values: ind.values.map((v) => ({ year: v.year, value: v.value, kind: 'archive' as ProvenanceKind, source: 'archive' })),
        };
      }
      countries.push(entry);
    }
    return countries.length ? { countries } : null;
  } catch {
    return null;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
export async function scrapeASEANTiered(): Promise<{ countries: number; officialShare: number }> {
  log('asean-tiered', 'Starting ASEAN tiered scraper (NSO → World Bank → OWID → archive)');
  const tieredDir = path.join(DATA_DIR, 'asean', 'tiered');
  ensureDir(tieredDir);

  const tier1: Record<string, Record<string, Buckets>> = {};
  const raw: Record<string, unknown> = { _scraped_at: timestamp(), tier1: {}, tier2: null, tier3: null };

  const my = await fetchMalaysia();
  if (my) tier1.MYS = my;
  raw.tier1 = { MYS: my ? Object.fromEntries(Object.entries(my).map(([k, v]) => [k, [...v.keys()]])) : null };
  await delay(RATE_LIMIT.defaultDelayMs);

  const sg = await fetchSingapore();
  if (sg) tier1.SGP = { 'SL.UEM.TOTL.ZS': sg };
  await delay(RATE_LIMIT.defaultDelayMs);

  const ph = await fetchPhilippines();
  if (ph) tier1.PHL = ph;
  await delay(RATE_LIMIT.defaultDelayMs);

  const tier2 = await fetchWorldBank();
  await delay(RATE_LIMIT.defaultDelayMs);
  const tier3 = await fetchOwid();

  const { countries, indicatorProvenance } = buildMerged(tier1, tier2, tier3);

  // Archive backfill per country (not all-or-nothing): if a country answered
  // in NO network tier, fill it from the last good run so it never silently
  // vanishes from the UI. The <6 threshold only controls the WARNING level.
  const EXPECTED_ISO3 = MODELED_COUNTRIES_ISO3.split(';');
  const have = new Set(countries.map((c) => c.iso3));
  const missing = EXPECTED_ISO3.filter((k) => !have.has(k));
  if (missing.length > 0) {
    log('asean-tiered', `WARNING: ${missing.join(',')} absent from every network tier — filling from repo archive`);
    const arc = readArchive();
    if (arc) {
      for (const c of arc.countries) {
        if (!missing.includes(c.iso3)) continue;
        countries.push(c);
        have.add(c.iso3);
        indicatorProvenance[c.iso3] = indicatorProvenance[c.iso3] || {};
        for (const code of Object.keys(c.indicators)) indicatorProvenance[c.iso3][code] = 'archive';
      }
    }
  }
  if (countries.length < 6) {
    log('asean-tiered', `CRITICAL: only ${countries.length}/${EXPECTED_ISO3.length} countries even after archive fill — sources are broadly down`);
  }

  // Legacy-shaped view (values without kind/source) for the UI file.
  const legacy = {
    countries: countries.map((c) => ({
      countryCode: c.countryCode || WB_ISO2[c.iso3] || c.iso3,
      countryName: c.countryName,
      iso3: c.iso3,
      indicators: Object.fromEntries(Object.entries(c.indicators).map(([code, ind]) => [
        code,
        { name: ind.name, values: ind.values.map((v) => ({ year: v.year, value: v.value, kind: v.kind, source: v.source })) },
      ])),
    })),
    provenance: ASEAN_PROVENANCE,
    indicatorProvenance,
    _source_url: 'ASEAN tiered: NSO (DOSM/SingStat/PSA) → World Bank/ILO modeled → OWID mirror → repo archive',
    _scraped_at: timestamp(),
  };
  writeJSON(path.join(WORLD_BANK.dataDir, '_by_country.json'), legacy);

  // Tier-4 safety snapshot: keep our own copy of the last KNOWN-GOOD merge so
  // a later failing run (or a failing asean-fallback overwrite) still has a
  // provenance-tagged archive to fall back to. Only written when the network
  // tiers produced data and no archive rows were needed.
  const usedArchive = legacy.countries.some((c) =>
    Object.values(c.indicators).some((i) => i.values.some((v) => v.kind === 'archive')));
  if (countries.length >= 6 && !usedArchive) {
    writeJSON(path.join(tieredDir, '_archive.json'), legacy);
  }

  const summary = {
    fetchedAt: timestamp(),
    tiers: {
      nso: Object.keys(tier1),
      worldbank: !!tier2,
      owid: !!tier3,
      archiveUsed: countries.some((c) => Object.values(c.indicators).some((i) => i.values.some((v) => v.kind === 'archive'))),
    },
    countries: countries.map((c) => ({
      iso3: c.iso3,
      name: c.countryName,
      latest: Object.fromEntries(Object.entries(c.indicators).map(([code, ind]) => {
        const offs = ind.values.filter((v) => v.kind === 'official');
        const anyV = ind.values.filter((v) => v.value !== null);
        const newest = anyV[anyV.length - 1];
        return [code, newest ? { year: newest.year, kind: newest.kind, officialUpTo: offs.length ? offs[offs.length - 1].year : null } : null];
      })),
    })),
    _source_url: legacy._source_url,
    _scraped_at: timestamp(),
  };
  writeJSON(path.join(tieredDir, '_summary.json'), summary);
  writeJSON(path.join(tieredDir, '_raw_tiers.json'), raw);

  const total = countries.reduce((n, c) => n + Object.values(c.indicators).reduce((m, i) => m + i.values.length, 0), 0);
  const official = countries.reduce((n, c) => n + Object.values(c.indicators).reduce((m, i) => m + i.values.filter((v) => v.kind === 'official').length, 0), 0);
  log('asean-tiered', `Done: ${countries.length} countries, ${total} points (${official} official = ${total ? ((official / total) * 100).toFixed(1) : 0}%)`);
  return { countries: countries.length, officialShare: total ? official / total : 0 };
}

if (require.main === module) {
  scrapeASEANTiered()
    .then((r) => log('asean-tiered', `Done. ${JSON.stringify(r)}`))
    .catch((err) => { log('asean-tiered', `Fatal: ${err}`); process.exit(1); });
}
