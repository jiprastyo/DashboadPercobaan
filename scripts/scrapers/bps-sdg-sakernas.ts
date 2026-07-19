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
  useTurvarEndpoint?: boolean;
  titleOverride?: string;
  metadataNote?: string;
  breakdownType: 'province' | 'sex' | 'industry';
  aggregateStrategy?: 'national_label' | 'sum_components';
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
  breakdownType: 'province' | 'sex' | 'industry';
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
    officialCode: '4.3.1',
    varId: 1998,
    turvarId: 922,
    useTurvarEndpoint: false,
    titleOverride:
      'Tingkat partisipasi remaja dan dewasa dalam pendidikan dan pelatihan formal dan non formal dalam 12 bulan terakhir, menurut jenis kelamin',
    metadataNote:
      'Kode 431 dipetakan ke tabel BPS Web API 4.3.1 yang tersedia menurut jenis kelamin. Nilai nasionalnya memakai kategori agregat "Laki-laki + Perempuan".',
    breakdownType: 'sex',
  },
  {
    requestedCode: '552',
    officialCode: '5.5.2',
    varId: 2003,
    metadataNote:
      'Kode 552 dipetakan ke tabel BPS Web API tentang proporsi perempuan yang berada di posisi managerial menurut provinsi.',
    breakdownType: 'province',
  },
  {
    requestedCode: '831',
    officialCode: '8.3.1',
    varId: 2153,
    metadataNote:
      'Kode 831 dipetakan ke tabel BPS Web API tentang proporsi lapangan kerja informal menurut provinsi.',
    breakdownType: 'province',
  },
  {
    requestedCode: '861',
    officialCode: '8.6.1',
    varId: 1186,
    metadataNote:
      'Kode 861 dipetakan ke tabel BPS Web API tentang persentase usia muda (15-24 tahun) yang tidak sekolah, bekerja, atau mengikuti pelatihan menurut provinsi.',
    breakdownType: 'province',
  },
  {
    requestedCode: '871A',
    officialCode: '8.7.1(a)',
    varId: 2008,
    metadataNote:
      'Kode 871A dipetakan ke tabel BPS Web API tentang persentase pekerja anak (usia 10-17 tahun) menurut provinsi.',
    breakdownType: 'province',
  },
  {
    requestedCode: '871',
    officialCode: '8.7.1',
    varId: 2009,
    metadataNote:
      'BPS tidak menampilkan kode 8.7.1 tanpa sufiks sebagai tabel terpisah. Untuk entri 871, dashboard memakai tabel BPS Web API pekerja anak menurut jenis kelamin sebagai padanan operasional yang paling dekat.',
    breakdownType: 'sex',
  },
  {
    requestedCode: '922',
    officialCode: '9.2.2',
    varId: 1217,
    metadataNote:
      'Kode 922 dipetakan ke tabel BPS Web API tentang proporsi tenaga kerja pada sektor industri manufaktur.',
    breakdownType: 'industry',
  },
];

const EXCLUDED_INDICATORS: ExcludedIndicator[] = [
  {
    requestedCode: '852A',
    officialCode: '8.5.2(a)',
    status: 'metadata_only',
    title: 'Tingkat Pengangguran menurut Jenis Kelamin dan Umur',
    reason:
      'Daftar tabel BPS Web API menunjukkan breakdown pengangguran terbuka menurut jenis kelamin tersedia, tetapi tabel itu tidak membawa satu garis agregat nasional yang setara dengan benchmark jangka panjang Sakernas. Karena itu kode 852A tetap ditahan sebagai catatan struktur tabel, sementara seri utama pengangguran nasional dibaca dari panel benchmark 852.',
    source: 'BPS Web API only',
  },
  {
    requestedCode: '852',
    officialCode: '8.5.2',
    status: 'metadata_only',
    title: 'Tingkat Pengangguran',
    reason:
      'Kode 8.5.2 diwakili langsung pada panel benchmark BPS Sakernas di menu SDG. Daftar tabel BPS Web API yang tersedia untuk isu pengangguran saat ini lebih banyak berbentuk breakdown terpisah menurut jenis kelamin, umur, pendidikan, dan daerah tempat tinggal, bukan satu kartu SDG dinamis yang identik dengan benchmark jangka panjang Sakernas.',
    source: 'BPS Web API only',
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

function normalizeValue(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function readDataValue(
  datacontent: Record<string, number | string>,
  vervar: string,
  varId: number,
  yearId: string,
  turvarId = 0
) {
  const exactCandidates = [
    `${vervar}${varId}${turvarId}${yearId}0`,
    `${vervar}${varId}${yearId}${turvarId}0`,
    `${vervar}${varId}${yearId}0`,
  ];

  for (const key of exactCandidates) {
    if (Object.prototype.hasOwnProperty.call(datacontent, key)) {
      return normalizeValue(datacontent[key]);
    }
  }

  const prefix = `${vervar}${varId}`;
  const suffix = `${yearId}0`;
  for (const [key, value] of Object.entries(datacontent)) {
    if (key.startsWith(prefix) && key.endsWith(suffix)) {
      return normalizeValue(value);
    }
  }
  return null;
}

function findAggregateBreakdown(rows: Array<{ code: string; label: string; value: number | null }>) {
  const direct = rows.find((item) => {
    const label = item.label.trim().toUpperCase();
    return (
      label === 'INDONESIA' ||
      label === 'NASIONAL' ||
      label === 'TOTAL' ||
      label === 'JUMLAH' ||
      label === 'LAKI-LAKI + PEREMPUAN' ||
      label === 'LAKI-LAKI+PEREMPUAN' ||
      label === 'BOTH SEXES'
    );
  });

  if (direct) {
    return direct;
  }

  const byCode = rows.find((item) => item.code === '9999' || item.code === '3');
  return byCode ?? null;
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
      config.turvarId && config.useTurvarEndpoint !== false
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

    const turvarId = config.turvarId ?? 0;
    const breakdownRows = json.vervar.map((item) => ({
      code: String(item.val),
      label: String(item.label),
      value: readDataValue(json.datacontent!, String(item.val), config.varId, yearId, turvarId),
    }));
    const aggregateRow = findAggregateBreakdown(breakdownRows);
    const nationalValue =
      config.aggregateStrategy === 'sum_components'
        ? Number(
            breakdownRows
              .reduce((sum, item) => sum + (item.value ?? 0), 0)
              .toFixed(2)
          )
        : aggregateRow?.value ?? null;

    series.push({
      year: year.th,
      value: nationalValue,
    });

    if (year.th === years[years.length - 1]?.th) {
      latestBreakdown = breakdownRows
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
    breakdownType: config.breakdownType,
    breakdownLabel: breakdownLabel || 'Rincian',
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
    source: 'official_bps_webapi_only',
    _source_url: 'https://webapi.bps.go.id/documentation/',
    _generated_at: new Date().toISOString(),
    requested_codes: ['431', '552', '831', '852A', '852', '861', '871A', '871', '922'],
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
