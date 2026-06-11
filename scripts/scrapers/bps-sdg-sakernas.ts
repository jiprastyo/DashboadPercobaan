import path from 'path';
import { DATA_DIR, ensureDir, fetchWithRetry, log, writeJSON } from '../config';

interface YearRow {
  th_id: number | string;
  th: string;
}

interface BpsDataResponse {
  status?: string;
  last_update?: string;
  subject?: Array<{ val: number | string; label: string }>;
  var?: Array<{
    val: number | string;
    label: string;
    unit?: string;
    subj?: string;
    note?: string;
  }>;
  labelvervar?: string;
  vervar?: Array<{ val: number | string; label: string }>;
  datacontent?: Record<string, number | string>;
}

interface AvailableIndicatorConfig {
  requestedCode: string;
  officialCode: string;
  varId: number;
  turvarId?: number;
  titleOverride?: string;
  metadataNote?: string;
  breakdownType: 'province';
}

interface IncludedIndicator {
  requestedCode: string;
  officialCode: string;
  varId: number;
  title: string;
  shortTitle: string;
  unit: string;
  subject: string;
  sourceNote: string;
  metadataNote: string;
  lastUpdate: string | null;
  years: Array<{
    year: string;
    value: number | null;
  }>;
  latestYear: string | null;
  latestValue: number | null;
  breakdownType: 'province';
  breakdownLabel: string;
  latestBreakdown: Array<{
    code: string;
    label: string;
    value: number | null;
  }>;
}

interface ExcludedIndicator {
  requestedCode: string;
  officialCode: string;
  status: 'metadata_only';
  title: string;
  reason: string;
  source: string;
}

const OUT_PATH = path.join(DATA_DIR, 'bps', 'sdg-sakernas.json');
const BPS_API_BASE = 'https://webapi.bps.go.id/v1/api/list';

const AVAILABLE_INDICATORS: AvailableIndicatorConfig[] = [
  {
    requestedCode: '431',
    officialCode: 'BPS Table 431',
    varId: 431,
    turvarId: 633,
    titleOverride:
      'Persentase Penduduk Usia 5 Tahun ke Atas yang Pernah Mengakses Internet dalam 3 Bulan Terakhir (Laki-laki, Total Pendidikan)',
    metadataNote:
      'Kode 431 yang diminta pengguna tersedia sebagai tabel dinamis BPS berbasis Susenas, bukan seri Sakernas.',
    breakdownType: 'province',
  },
  {
    requestedCode: '871',
    officialCode: '8.7.1(a)',
    varId: 2008,
    metadataNote:
      'BPS tidak menampilkan kode 8.7.1 tanpa sufiks sebagai tabel terpisah. Seri resmi terdekat yang tersedia adalah 8.7.1(a) untuk pekerja anak menurut provinsi.',
    breakdownType: 'province',
  },
];

const EXCLUDED_INDICATORS: ExcludedIndicator[] = [
  {
    requestedCode: '552',
    officialCode: '5.5.2',
    status: 'metadata_only',
    title: 'Representasi Perempuan dalam Posisi Pengambilan Keputusan',
    reason:
      'Pada pengecekan BPS SDGs per 10 Juni 2026, kode 5.5.2 tidak muncul sebagai tabel deret waktu yang dapat diambil dari endpoint dinamis yang sama.',
    source: 'BPS SDGs API metadata',
  },
];

function getApiKey(): string {
  const apiKey = process.env.BPS_API_KEY;
  if (!apiKey) {
    throw new Error('BPS_API_KEY is required to build requested SDG data.');
  }
  return apiKey;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetchWithRetry(url, {
    headers: {
      Accept: 'application/json,text/plain,*/*',
    },
  });
  return (await response.json()) as T;
}

async function fetchYears(apiKey: string, varId: number): Promise<YearRow[]> {
  let page = 1;
  let totalPages = 1;
  const years: YearRow[] = [];

  while (page <= totalPages) {
    const url = `${BPS_API_BASE}/model/th/domain/0000/var/${varId}/page/${page}/key/${apiKey}`;
    const json = await fetchJson<any>(url);
    const info = json?.data?.[0];
    const rows = json?.data?.[1] ?? [];
    totalPages = Number(info?.pages ?? 1);
    years.push(...rows);
    page += 1;
  }

  return years.sort((a, b) => Number(a.th) - Number(b.th));
}

function buildDataKey(vervar: string, varId: number, turvarId: number, yearId: string) {
  return `${vervar}${varId}${turvarId}${yearId}0`;
}

function normalizeValue(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

async function fetchIndicator(apiKey: string, config: AvailableIndicatorConfig): Promise<IncludedIndicator> {
  const years = await fetchYears(apiKey, config.varId);
  const series: Array<{ year: string; value: number | null }> = [];

  let lastUpdate: string | null = null;
  let subject = '';
  let title = config.titleOverride ?? '';
  let unit = '';
  let sourceNote = '';
  let breakdownLabel = '';
  let latestBreakdown: Array<{ code: string; label: string; value: number | null }> = [];

  for (const year of years) {
    const yearId = String(year.th_id);
    const url =
      config.turvarId
        ? `${BPS_API_BASE}/model/data/domain/0000/var/${config.varId}/turvar/${config.turvarId}/th/${yearId}/key/${apiKey}`
        : `${BPS_API_BASE}/model/data/domain/0000/var/${config.varId}/th/${yearId}/key/${apiKey}`;

    const json = await fetchJson<BpsDataResponse>(url);
    if (json.status !== 'OK' || !json.vervar || !json.datacontent) {
      series.push({ year: year.th, value: null });
      continue;
    }

    if (!lastUpdate && json.last_update) lastUpdate = json.last_update;
    if (!subject && json.subject?.[0]?.label) subject = json.subject[0].label;
    if (!title && json.var?.[0]?.label) title = json.var[0].label;
    if (!unit && json.var?.[0]?.unit) unit = json.var[0].unit;
    if (!sourceNote && json.var?.[0]?.note) sourceNote = json.var[0].note;
    if (!breakdownLabel && json.labelvervar) breakdownLabel = json.labelvervar;

    const national = json.vervar.find((item) => String(item.label).trim().toUpperCase() === 'INDONESIA');
    const turvarId = config.turvarId ?? 0;
    const nationalValue = national
      ? normalizeValue(json.datacontent[buildDataKey(String(national.val), config.varId, turvarId, yearId)])
      : null;

    series.push({
      year: year.th,
      value: nationalValue,
    });

    if (year.th === years[years.length - 1]?.th) {
      latestBreakdown = json.vervar
        .map((item) => ({
          code: String(item.val),
          label: String(item.label),
          value: normalizeValue(
            json.datacontent?.[buildDataKey(String(item.val), config.varId, turvarId, yearId)]
          ),
        }))
        .filter((item) => item.value !== null)
        .sort((left, right) => {
          if (left.label === 'INDONESIA') return -1;
          if (right.label === 'INDONESIA') return 1;
          return (right.value ?? -Infinity) - (left.value ?? -Infinity);
        });
    }
  }

  const latest = [...series].reverse().find((item) => item.value !== null) ?? null;

  return {
    requestedCode: config.requestedCode,
    officialCode: config.officialCode,
    varId: config.varId,
    title,
    shortTitle: config.requestedCode,
    unit: unit || 'Persen',
    subject: subject || 'BPS',
    sourceNote,
    metadataNote: config.metadataNote ?? '',
    lastUpdate,
    years: series,
    latestYear: latest?.year ?? null,
    latestValue: latest?.value ?? null,
    breakdownType: 'province',
    breakdownLabel: breakdownLabel || 'Provinsi',
    latestBreakdown,
  };
}

export async function scrapeBPSSDGSakernas() {
  const apiKey = getApiKey();
  ensureDir(path.dirname(OUT_PATH));

  const included: IncludedIndicator[] = [];
  for (const indicator of AVAILABLE_INDICATORS) {
    log('bps-sdg-sakernas', `Fetching requested code ${indicator.requestedCode} via var ${indicator.varId}...`);
    included.push(await fetchIndicator(apiKey, indicator));
  }

  const payload = {
    source: 'official_bps_requested_codes',
    _source_url: 'https://webapi.bps.go.id/documentation/',
    _generated_at: new Date().toISOString(),
    requested_codes: ['431', '552', '871'],
    included_indicators: included,
    excluded_requested_indicators: EXCLUDED_INDICATORS,
  };

  writeJSON(OUT_PATH, payload);
  log('bps-sdg-sakernas', `Wrote ${included.length} requested-code entries.`);
  return payload;
}

if (require.main === module) {
  scrapeBPSSDGSakernas().catch((error) => {
    log('bps-sdg-sakernas', `Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
