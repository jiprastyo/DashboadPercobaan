import fs from 'fs';
import path from 'path';
import { evaluateFreshness, type HealthStatus } from './constants';

const DATA_DIR = path.join(process.cwd(), 'data');

interface GoogleTrendPoint {
  time?: string;
  formattedTime?: string;
  value?: number;
}

interface GoogleTrendResult {
  keyword?: string;
  data?: GoogleTrendPoint[];
}

interface GoogleTrendsFile {
  fetchedAt?: string;
  week?: string;
  keywords?: string[];
  results?: GoogleTrendResult[];
}

export interface ASEANHistoricalData {
  countries: Array<{
    countryCode: string;
    countryName: string;
    indicators: Record<
      string,
      {
        name: string;
        values: Array<{
          year: string;
          value: number | null;
        }>;
      }
    >;
  }>;
  _source_url: string;
  _scraped_at: string;
}

export interface ASEANIndicatorMetadata {
  indicatorId: string;
  title: string;
  primaryLabel: string;
  primaryDescription: string;
  primarySourceUrl: string;
  overlayLabel: string;
  overlayDescription: string;
  overlaySourceUrl: string;
}

export interface ASEANComparableData {
  primary: ASEANHistoricalData | null;
  worldBank: ASEANHistoricalData | null;
  metadata: ASEANIndicatorMetadata[];
}

export function getASEANHistoricalData(): ASEANHistoricalData | null {
  try {
    const filePath = path.join(DATA_DIR, 'asean', 'fallback', '_by_country.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as ASEANHistoricalData;
  } catch (error) {
    console.error('Error reading ASEAN historical data:', error);
    return null;
  }
}

export function getASEANComparableData(
  bpsHistorical: BPSHistoricalFile | null
): ASEANComparableData | null {
  const worldBank = getASEANHistoricalData();
  if (!worldBank) {
    return null;
  }

  const primaryCountries = worldBank.countries.map((country) => {
    if (country.countryCode !== 'ID') {
      return country;
    }

    const bpsSeries = bpsHistorical?.data ?? [];
    const unemploymentValues = bpsSeries.map((point) => ({
      year: point.year,
      value: point.tpt,
    }));
    const lfprValues = bpsSeries.map((point) => ({
      year: point.year,
      value: point.tpak,
    }));
    const eprValues = bpsSeries.map((point) => ({
      year: point.year,
      value: Number((point.tpak * (1 - point.tpt / 100)).toFixed(3)),
    }));

    return {
      ...country,
      indicators: {
        ...country.indicators,
        'SL.UEM.TOTL.ZS': {
          name: 'Tingkat Pengangguran Terbuka (%)',
          values: unemploymentValues,
        },
        'SL.TLF.CACT.ZS': {
          name: 'Tingkat Partisipasi Angkatan Kerja (%)',
          values: lfprValues,
        },
        'SL.EMP.TOTL.SP.ZS': {
          name: 'Rasio Pekerja terhadap Populasi (%)',
          values: eprValues,
        },
      },
    };
  });

  return {
    primary: {
      ...worldBank,
      countries: primaryCountries,
      _source_url: bpsHistorical?._source_url || worldBank._source_url,
    },
    worldBank,
    metadata: [
      {
        indicatorId: 'SL.UEM.TOTL.ZS',
        title: 'Tingkat Pengangguran Terbuka (%)',
        primaryLabel: 'Default: BPS untuk Indonesia, panel historis ASEAN lokal untuk pembanding',
        primaryDescription:
          'Indonesia mengikuti seri resmi BPS. Untuk negara ASEAN lain, repo ini masih memakai panel historis kawasan yang sudah termaterialisasi lokal sambil menunggu refresh penuh seri ILOSTAT National.',
        primarySourceUrl: bpsHistorical?._source_url || 'https://www.bps.go.id/subject/6/tenaga-kerja.html',
        overlayLabel: 'Overlay opsional: World Bank modeled ILO estimate',
        overlayDescription:
          'World Bank menampilkan unemployment sebagai modeled ILO estimate, yaitu seri tahunan yang diharmonisasi lintas negara. Nilai ini cocok untuk panel panjang dan konsisten, tetapi bisa berbeda dari rilis nasional seperti Sakernas BPS.',
        overlaySourceUrl: 'https://api.worldbank.org/v2/country/IDN/indicator/SL.UEM.TOTL.ZS?format=json&per_page=6',
      },
      {
        indicatorId: 'SL.TLF.CACT.ZS',
        title: 'Tingkat Partisipasi Angkatan Kerja (TPAK) (%)',
        primaryLabel: 'Default: BPS untuk Indonesia, panel historis ASEAN lokal untuk pembanding',
        primaryDescription:
          'TPAK Indonesia mengikuti seri resmi BPS. Untuk negara lain, tampilan default tetap memprioritaskan seri kawasan yang sudah tersimpan lokal sampai file ILOSTAT National historis termaterialisasi penuh.',
        primarySourceUrl: bpsHistorical?._source_url || 'https://www.bps.go.id/subject/6/tenaga-kerja.html',
        overlayLabel: 'Overlay opsional: World Bank modeled ILO estimate',
        overlayDescription:
          'World Bank mendefinisikan LFPR sebagai share penduduk usia 15+ yang bekerja atau aktif mencari kerja. Seri ini merupakan modeled ILO estimate, sehingga angka lintas negara rapi namun tidak selalu sama dengan definisi operasional dan waktu observasi BPS.',
        overlaySourceUrl: 'https://api.worldbank.org/v2/country/IDN/indicator/SL.TLF.CACT.ZS?format=json&per_page=6',
      },
      {
        indicatorId: 'SL.EMP.TOTL.SP.ZS',
        title: 'Rasio Pekerja terhadap Populasi (%)',
        primaryLabel: 'Default: BPS untuk Indonesia, panel historis ASEAN lokal untuk pembanding',
        primaryDescription:
          'Untuk Indonesia, rasio pekerja terhadap populasi dihitung dari TPAK x (1 - TPT) menggunakan seri resmi BPS. Negara lain tetap membaca panel historis kawasan yang tersedia di repo.',
        primarySourceUrl: bpsHistorical?._source_url || 'https://www.bps.go.id/subject/6/tenaga-kerja.html',
        overlayLabel: 'Overlay opsional: World Bank modeled ILO estimate',
        overlayDescription:
          'World Bank mendeskripsikan indikator ini sebagai employment-to-population ratio usia 15+, total, dan secara resmi menandainya modeled ILO estimate. Ringkasnya, indikator ini mengukur porsi penduduk usia kerja yang sedang bekerja dalam seri tahunan yang sudah diharmonisasi.',
        overlaySourceUrl: 'https://api.worldbank.org/v2/country/IDN/indicator/SL.EMP.TOTL.SP.ZS?format=json&per_page=6',
      },
    ],
  };
}

// ---- Benchmark targets (viz-revamp-roadmap Stage 1) --------------------------
// Hand-curated official targets from data/benchmarks/targets.json. Rendered as
// Recharts ReferenceLine/ReferenceArea only, never mixed into observed series.
export interface BenchmarkTargetRaw {
  id: string;
  indicator: string;
  label: string;
  scope: 'national' | 'regional' | 'global';
  value_min?: number | null;
  value_max?: number | null;
  unit?: string;
  period?: string;
  horizon?: string;
  computed?: boolean;
  compute?: string;
  source_name?: string;
  verified_note?: string;
  _source_url?: string;
  _verified_at?: string;
}

export interface BenchmarkTargetsFile {
  _notes?: string;
  _source_url?: string;
  _updated_at?: string;
  targets: BenchmarkTargetRaw[];
}

// A resolved, chart-ready target. Placeholder/unverified entries never become
// one of these because getBenchmarkTargets skips them (see the guard below).
export interface BenchmarkTarget {
  id: string;
  indicator: string;
  label: string;
  scope: 'national' | 'regional' | 'global';
  valueMin: number;
  valueMax: number;
  unit: string;
  period?: string;
  horizon?: string;
  computed: boolean;
  sourceName: string;
  sourceUrl: string;
}

// True when an entry is a real, chart-safe target. A URL that is missing, still
// the TODO/placeholder sentinel, or otherwise not http(s) fails the check, as
// does any non-computed entry without both numeric band bounds. Computed entries
// carry no static values (the loader fills them from repo data below).
function isPlaceholderUrl(url: string | undefined): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (/todo|verify-official|placeholder/i.test(trimmed)) return true;
  return !/^https?:\/\//i.test(trimmed);
}

function computeAseanMedianTpt(): number | null {
  const asean = getASEANHistoricalData();
  if (!asean?.countries?.length) return null;
  const latestPerCountry: number[] = [];
  for (const country of asean.countries) {
    const series = country.indicators?.['SL.UEM.TOTL.ZS']?.values ?? [];
    let latestYear = -Infinity;
    let latestValue: number | null = null;
    for (const point of series) {
      const year = Number(point.year);
      if (Number.isFinite(year) && point.value !== null && point.value !== undefined && year > latestYear) {
        latestYear = year;
        latestValue = point.value;
      }
    }
    if (latestValue !== null) latestPerCountry.push(latestValue);
  }
  if (latestPerCountry.length === 0) return null;
  const sorted = [...latestPerCountry].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Number(median.toFixed(2));
}

export function getBenchmarkTargets(): BenchmarkTarget[] {
  let file: BenchmarkTargetsFile | null = null;
  try {
    const filePath = path.join(DATA_DIR, 'benchmarks', 'targets.json');
    file = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as BenchmarkTargetsFile;
  } catch (error) {
    console.error('Failed to load benchmark targets:', error);
    return [];
  }

  const resolved: BenchmarkTarget[] = [];
  for (const entry of file.targets ?? []) {
    // Guard 1: a placeholder/TODO/non-http URL can never reach a chart.
    if (isPlaceholderUrl(entry._source_url)) {
      continue;
    }

    let valueMin: number | null;
    let valueMax: number | null;

    if (entry.computed) {
      // Computed entries derive their value from repo data, labeled as computed.
      let computedValue: number | null = null;
      if (entry.id === 'asean-median-tpt') {
        computedValue = computeAseanMedianTpt();
      }
      if (computedValue === null) {
        continue;
      }
      valueMin = computedValue;
      valueMax = computedValue;
    } else {
      valueMin = entry.value_min ?? null;
      valueMax = entry.value_max ?? null;
    }

    // Guard 2: null/NaN band bounds (the sentinel entries) are skipped.
    if (
      valueMin === null ||
      valueMax === null ||
      !Number.isFinite(valueMin) ||
      !Number.isFinite(valueMax)
    ) {
      continue;
    }

    resolved.push({
      id: entry.id,
      indicator: entry.indicator,
      label: entry.label,
      scope: entry.scope,
      valueMin,
      valueMax,
      unit: entry.unit ?? '%',
      period: entry.period,
      horizon: entry.horizon,
      computed: Boolean(entry.computed),
      sourceName: entry.source_name ?? '',
      sourceUrl: entry._source_url as string,
    });
  }

  return resolved;
}

export interface ProvinsiTPTItem {
  province_code: string;
  province_name: string;
  tpt_feb_25: number | null;
  tpt_feb_26: number | null;
  _last_updated: string;
}

export interface BPSProvinsiFile {
  source: 'official_api' | 'fallback_spreadsheet';
  data: ProvinsiTPTItem[];
}

export interface BPSProvinsiHistoricalPoint {
  id: string;
  province_code: string;
  province_name: string;
  year: string;
  period_code: '189' | '190' | '191';
  period_label: string;
  observation_date: string;
  observation_label: string;
  axis_label: string;
  tpt: number;
}

export interface BPSProvinsiHistoricalFile {
  source: string;
  _source_url: string;
  _notes?: string[];
  data: BPSProvinsiHistoricalPoint[];
}

export function getBPSProvinsiData(): BPSProvinsiFile | null {
  try {
    const filePath = path.join(DATA_DIR, 'bps', 'provinsi', 'tpt.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(rawData);
    if (Array.isArray(parsed)) {
      return {
        source: 'fallback_spreadsheet',
        data: parsed
      };
    }
    return parsed as BPSProvinsiFile;
  } catch (error) {
    console.error('Error reading BPS Provinsi data:', error);
    return null;
  }
}

export function getBPSProvinsiHistoricalData(): BPSProvinsiHistoricalFile | null {
  try {
    const filePath = path.join(DATA_DIR, 'bps', 'provinsi', 'tpt-historical.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as BPSProvinsiHistoricalFile;
  } catch (error) {
    console.error('Error reading BPS provincial historical data:', error);
    return null;
  }
}

export interface BPSNationalItem {
  id: string;
  indicator: 'ihk' | 'ekspor' | 'impor';
  period: string;
  value: number;
  change_mom?: number;
  change_yoy?: number;
}

export interface BPSNationalFile {
  source: 'official_api' | 'static_seed' | 'historical_seed';
  _source_url?: string;
  data: BPSNationalItem[];
}

export function getBPSNationalData(): BPSNationalFile | null {
  try {
    const filePath = path.join(DATA_DIR, 'bps', 'national-indicators.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as BPSNationalFile;
  } catch (error) {
    console.error('Error reading BPS National data:', error);
    return null;
  }
}

export function getBPSHistoricalIhkTradeData(): BPSNationalFile | null {
  try {
    const filePath = path.join(DATA_DIR, 'bps', 'historical-ihk-trade.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as BPSNationalFile;
  } catch (error) {
    console.error('Error reading BPS historical IHK/Trade data:', error);
    return null;
  }
}

export type BPSBRSIndicator =
  | 'ketenagakerjaan'
  | 'kemiskinan'
  | 'pertumbuhan-ekonomi'
  | 'ntp'
  | 'wisman'
  | 'ekspor-impor';

export interface BPSBRSIndicatorOption {
  id: BPSBRSIndicator;
  label: string;
  shortLabel: string;
}

export interface RawBPSBRSArticle {
  title?: string;
  date?: string;
  rl_date?: string;
  summary?: string;
  abstract?: string;
  link?: string;
  pdf?: string;
  indicator?: string;
  _source_url?: string;
  _scraped_at?: string;
}

export interface BPSBRSRelease {
  id: string;
  title: string;
  date: string;
  year: string;
  summary: string;
  link: string;
  sourceUrl: string;
  indicator: BPSBRSIndicator;
  indicatorLabel: string;
  scrapedAt?: string;
}

export interface BPSBRSArchive {
  releases: BPSBRSRelease[];
  indicators: BPSBRSIndicatorOption[];
  years: string[];
  total: number;
  byIndicator: Record<BPSBRSIndicator, number>;
}

const BPS_BRS_INDICATORS: BPSBRSIndicatorOption[] = [
  { id: 'ketenagakerjaan', label: 'Ketenagakerjaan', shortLabel: 'Naker' },
  { id: 'kemiskinan', label: 'Kemiskinan & Ketimpangan', shortLabel: 'Kemiskinan' },
  { id: 'pertumbuhan-ekonomi', label: 'Pertumbuhan Ekonomi / PDB', shortLabel: 'PDB' },
  { id: 'ntp', label: 'Nilai Tukar Petani', shortLabel: 'NTP' },
  { id: 'wisman', label: 'Wisatawan Mancanegara', shortLabel: 'Wisman' },
  { id: 'ekspor-impor', label: 'Ekspor-Impor', shortLabel: 'Ekspor-Impor' },
];

const MONTHLY_BPS_FILE_RE = /^\d{4}-\d{2}\.json$/;

function normalizeBRSDate(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

function cleanBRSText(value?: string, maxLength = 520): string {
  if (!value) return '';
  const normalized = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized;
}

function isBRSIndicator(value: string): value is BPSBRSIndicator {
  return BPS_BRS_INDICATORS.some((indicator) => indicator.id === value);
}

export function getBPSBRSArchive(): BPSBRSArchive {
  const releases: BPSBRSRelease[] = [];
  const seenLinks = new Set<string>();
  const seenStableKeys = new Set<string>();

  for (const indicator of BPS_BRS_INDICATORS) {
    const indicatorDir = path.join(DATA_DIR, 'bps', indicator.id);
    if (!fs.existsSync(indicatorDir)) {
      continue;
    }

    const files = fs
      .readdirSync(indicatorDir)
      .filter((file) => MONTHLY_BPS_FILE_RE.test(file))
      .sort()
      .reverse();

    for (const file of files) {
      const filePath = path.join(indicatorDir, file);
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as RawBPSBRSArticle[];
        if (!Array.isArray(parsed)) {
          continue;
        }

        for (const item of parsed) {
          const rawIndicator = item.indicator || '';
          const itemIndicator: BPSBRSIndicator = isBRSIndicator(rawIndicator) ? rawIndicator : indicator.id;
          const title = cleanBRSText(item.title, 240);
          const link = item.pdf || item.link || item._source_url || '';
          const date = normalizeBRSDate(item.rl_date || item.date || '');

          if (!title || !link || !date) {
            continue;
          }

          const stableKey = `${itemIndicator}:${date}:${title.toLowerCase()}`;
          if (seenLinks.has(link) || seenStableKeys.has(stableKey)) {
            continue;
          }
          seenLinks.add(link);
          seenStableKeys.add(stableKey);

          const option = BPS_BRS_INDICATORS.find((candidate) => candidate.id === itemIndicator) || indicator;
          releases.push({
            id: `${itemIndicator}:${date}:${seenStableKeys.size}`,
            title,
            date,
            year: date.slice(0, 4),
            summary: cleanBRSText(item.summary || item.abstract || ''),
            link,
            sourceUrl: item._source_url || link,
            indicator: itemIndicator,
            indicatorLabel: option.label,
            scrapedAt: item._scraped_at,
          });
        }
      } catch (error) {
        console.error(`Error reading BPS BRS data from ${filePath}:`, error);
      }
    }
  }

  releases.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    return dateCompare === 0 ? a.title.localeCompare(b.title) : dateCompare;
  });

  const years = Array.from(new Set(releases.map((release) => release.year))).sort().reverse();
  const byIndicator = BPS_BRS_INDICATORS.reduce<Record<BPSBRSIndicator, number>>((counts, indicator) => {
    counts[indicator.id] = releases.filter((release) => release.indicator === indicator.id).length;
    return counts;
  }, {} as Record<BPSBRSIndicator, number>);

  return {
    releases,
    indicators: BPS_BRS_INDICATORS,
    years,
    total: releases.length,
    byIndicator,
  };
}

export interface BPSWismanFile {
  source: string;
  _source_url: string;
  data: Array<{
    period: string;
    indicator: 'wisman';
    value: number;
    change_yoy: number;
  }>;
}

export function getBPSWismanData(): BPSWismanFile | null {
  try {
    const filePath = path.join(DATA_DIR, 'bps', 'wisman.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as BPSWismanFile;
  } catch (error) {
    console.error('Error reading BPS Wisman data:', error);
    return null;
  }
}

export interface BIPMISeriesItem {
  period: string;
  pmi_value: number;
  category?: string;
  description?: string;
  _source_url: string;
  _scraped_at: string;
}

export function getBIPMIData(): BIPMISeriesItem[] {
  try {
    const filePath = path.join(DATA_DIR, 'bi', 'pmi', 'series.json');
    if (!fs.existsSync(filePath)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as BIPMISeriesItem[];
  } catch (error) {
    console.error('Failed to load BI PMI data:', error);
    return [];
  }
}

export interface BPSHistoricalFile {
  source: string;
  _source_url: string;
  data: Array<{
    year: string;
    tpt: number;
    tpak: number;
  }>;
}

export interface BPSTptHistoricalPoint {
  id: string;
  year: string;
  period_code: '189' | '190' | '191';
  period_label: string;
  observation_date: string;
  observation_label: string;
  axis_label: string;
  tpt: number;
}

export interface BPSTptHistoricalFile {
  source: string;
  _source_url: string;
  _notes?: string[];
  data: BPSTptHistoricalPoint[];
}

export interface BPSSDGSakernasIndicator {
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
  breakdownType: 'province' | 'industry';
  breakdownLabel: string;
  latestBreakdown: Array<{
    code: string;
    label: string;
    value: number | null;
  }>;
}

export interface BPSSDGSakernasExclusion {
  requestedCode: string;
  officialCode: string;
  status: 'metadata_only';
  title: string;
  reason: string;
  source: string;
}

export interface BPSSDGSakernasFile {
  source: string;
  _source_url: string;
  _generated_at: string;
  requested_codes: string[];
  included_indicators: BPSSDGSakernasIndicator[];
  excluded_requested_indicators: BPSSDGSakernasExclusion[];
}

export function getBPSHistoricalData(): BPSHistoricalFile | null {
  try {
    const filePath = path.join(DATA_DIR, 'bps', 'national-historical.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as BPSHistoricalFile;
  } catch (error) {
    console.error('Error reading BPS historical data:', error);
    return null;
  }
}

export function getBPSTptHistoricalData(): BPSTptHistoricalFile | null {
  try {
    const filePath = path.join(DATA_DIR, 'bps', 'national-tpt-sakernas.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as BPSTptHistoricalFile;
  } catch (error) {
    console.error('Error reading BPS TPT historical data:', error);
    return null;
  }
}

export function getBPSSDGSakernasData(): BPSSDGSakernasFile | null {
  try {
    const filePath = path.join(DATA_DIR, 'bps', 'sdg-sakernas.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as BPSSDGSakernasFile;
  } catch (error) {
    console.error('Error reading BPS SDG Sakernas data:', error);
    return null;
  }
}

export interface KemenakerPHKArticle {
  title: string;
  date: string;
  summary: string;
  link: string;
  _source_url: string;
  _scraped_at: string;
}

export function getPHKArticles(): KemenakerPHKArticle[] {
  try {
    const filePath = path.join(DATA_DIR, 'kemenaker', 'phk', 'articles.json');
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as KemenakerPHKArticle[];
  } catch (error) {
    console.error('Error reading Kemenaker PHK articles:', error);
    return [];
  }
}

let newsCache: any[] | null = null;

export function getNewsData(): any[] {
  if (newsCache) {
    return newsCache;
  }
  try {
    const filePath = path.join(DATA_DIR, 'news', 'historical-seed.json');
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    newsCache = JSON.parse(rawData);
    // Sort by date descending
    newsCache!.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return newsCache!;
  } catch (error) {
    console.error('Error reading news data:', error);
    return [];
  }
}

export interface PHKIntensityPoint {
  month: string;        // YYYY-MM
  monthLabel: string;   // id-ID "Bulan Tahun"
  kemenaker: number;    // Kemenaker official PHK release count
  berita: number;       // news-archive PHK-tagged article count
  total: number;
}

// Stage 2.3 honest PHK tracker: monthly ARTICLE/RELEASE counts as a reporting-
// intensity proxy. Combines Kemenaker official PHK releases with news-archive
// rows whose keywords_matched contains 'phk' / 'pemutusan hubungan kerja'
// (same rule as overview-data.ts generalPHK). This is a signal proxy, NOT a
// count of workers affected; no number is ever extracted from any headline.
export function getPHKIntensitySeries(): PHKIntensityPoint[] {
  const kemenaker = getPHKArticles();
  const news = getNewsData();

  const monthKey = (raw: unknown): string | null => {
    if (!raw) return null;
    const date = new Date(String(raw));
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  const buckets = new Map<string, { kemenaker: number; berita: number }>();
  const bump = (key: string | null, field: 'kemenaker' | 'berita') => {
    if (!key) return;
    const bucket = buckets.get(key) ?? { kemenaker: 0, berita: 0 };
    bucket[field] += 1;
    buckets.set(key, bucket);
  };

  for (const article of kemenaker) {
    bump(monthKey(article.date), 'kemenaker');
  }
  for (const article of news) {
    const matched: string[] = article.keywords_matched || [];
    const isPHK = matched.some((keyword) => {
      const normalized = String(keyword).toLowerCase();
      return normalized === 'phk' || normalized.includes('pemutusan hubungan kerja');
    });
    if (isPHK) {
      bump(monthKey(article.date), 'berita');
    }
  }

  const monthFormatter = new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({
      month,
      monthLabel: monthFormatter.format(new Date(`${month}-01T00:00:00Z`)),
      kemenaker: counts.kemenaker,
      berita: counts.berita,
      total: counts.kemenaker + counts.berita,
    }));
}

// getGoogleTrendsData removed in Stage 0.5 (unused; /tren reads trends directly).

export interface ScraperMetadata {
  lastFetch?: string;
  lastStatus?: string;
  lastLatencyMs?: number;
  lastItemsFetched?: number;
}

export interface DashboardMetadata {
  lastUpdated?: string;
  scrapers?: Record<string, ScraperMetadata>;
}

export interface OpsLogEntry {
  scraper: string;
  status: string;
  started_at?: string;
  finished_at?: string;
  latency_ms?: number;
  items_fetched?: number;
  items_new?: number;
  errors?: string[];
  _source_url?: string;
  _scraped_at?: string;
}

export interface DataInventoryEntry {
  id: string;
  label: string;
  path: string;
  status: 'ok' | 'warning' | 'error';
  lastUpdated?: string;
  records: number;
  source: string;
  note: string;
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return fallback;
  }
}

function latestJsonFile(dirPath: string, predicate: (fileName: string) => boolean = () => true): string | null {
  if (!fs.existsSync(dirPath)) {
    return null;
  }

  return fs
    .readdirSync(dirPath)
    .filter((fileName) => fileName.endsWith('.json') && predicate(fileName))
    .sort()
    .at(-1) || null;
}

function countRecords(value: any): number {
  if (Array.isArray(value)) {
    return value.length;
  }
  if (Array.isArray(value?.data)) {
    return value.data.length;
  }
  if (Array.isArray(value?.results)) {
    return value.results.length;
  }
  if (Array.isArray(value?.summaries)) {
    return value.summaries.length;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length;
  }
  return 0;
}

function newestTimestamp(values: Array<string | undefined | null>): string | undefined {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) {
    return undefined;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function inventoryStatus(lastUpdated: string | undefined, staleAfterDays: number): DataInventoryEntry['status'] {
  if (!lastUpdated) {
    return 'warning';
  }

  const ageMs = Date.now() - new Date(lastUpdated).getTime();
  if (!Number.isFinite(ageMs)) {
    return 'warning';
  }

  return ageMs > staleAfterDays * 86400000 ? 'warning' : 'ok';
}

export function getDashboardMetadata(): DashboardMetadata {
  return readJsonFile<DashboardMetadata>(path.join(DATA_DIR, '_metadata.json'), {});
}

// --- Stage 4: source freshness (badges + /operasional share this) ---

export interface SourceFreshness {
  source: string;
  status: HealthStatus;
  reason: string;
  lastFetch?: string;
  ageDays: number | null;
}

/**
 * Build-time freshness for one scraper id, combining
 * data/_metadata.json `scrapers.<name>.lastFetch/lastStatus` with the
 * shared staleness-window table and the ONE shared rule in
 * `evaluateFreshness` (src/lib/constants.ts). This is frozen at build
 * time like every other computed value in this static export -- see
 * "status per build terakhir" in the UI copy that consumes it.
 */
export function getSourceFreshness(source: string): SourceFreshness {
  const metadata = getDashboardMetadata();
  const entry = metadata.scrapers?.[source];
  const lastFetch = entry?.lastFetch;
  const ageDays = isValidDateString(lastFetch)
    ? Math.floor((Date.now() - new Date(lastFetch as string).getTime()) / 86400000)
    : null;

  const { status, reason } = evaluateFreshness({
    source,
    lastStatus: entry?.lastStatus,
    ageDays,
  });

  return { source, status, reason, lastFetch, ageDays };
}

function isValidDateString(value?: string): value is string {
  return Boolean(value && Number.isFinite(new Date(value).getTime()));
}

/**
 * Freshness for a manual-run source that has no data/_metadata.json
 * scraper entry (e.g. bps-sdg-sakernas, regenerated by hand from BPS Web
 * API pulls). Same shared rule, but staleness is computed from the data
 * file's own timestamp (e.g. `_generated_at`) instead of scrapers.<name>.
 * There is no `lastStatus` for a manual run, so status is staleness-only.
 */
export function getManualSourceFreshness(source: string, generatedAt?: string): SourceFreshness {
  const ageDays = isValidDateString(generatedAt)
    ? Math.floor((Date.now() - new Date(generatedAt).getTime()) / 86400000)
    : null;

  const { status, reason } = evaluateFreshness({ source, lastStatus: undefined, ageDays });

  return { source, status, reason, lastFetch: generatedAt, ageDays };
}

export function getOpsRuns(): OpsLogEntry[] {
  try {
    const opsDir = path.join(DATA_DIR, 'ops');
    if (!fs.existsSync(opsDir)) {
      return [];
    }

    return fs
      .readdirSync(opsDir)
      .filter((fileName) => fileName.endsWith('.json'))
      .sort()
      .flatMap((fileName) => {
        const parsed = readJsonFile<OpsLogEntry[]>(path.join(opsDir, fileName), []);
        return Array.isArray(parsed) ? parsed : [];
      })
      .filter((entry) => entry.scraper && entry.scraper.toLowerCase() !== 'setkab')
      .sort((left, right) => {
        const leftTime = new Date(left.finished_at || left._scraped_at || left.started_at || 0).getTime();
        const rightTime = new Date(right.finished_at || right._scraped_at || right.started_at || 0).getTime();
        return rightTime - leftTime;
      });
  } catch (error) {
    console.error('Error reading ops logs:', error);
    return [];
  }
}

export function getDataInventory(): DataInventoryEntry[] {
  const news = getNewsData();
  const latestNewsDate = news[0]?.date || news[0]?._scraped_at;
  const latestDailyNews = latestJsonFile(path.join(DATA_DIR, 'news'), (fileName) => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName));
  const latestSummary = latestJsonFile(path.join(DATA_DIR, 'summaries'));
  const latestTrends = latestJsonFile(path.join(DATA_DIR, 'trends', 'node'));
  const latestOps = latestJsonFile(path.join(DATA_DIR, 'ops'));

  const dailyNewsData = latestDailyNews
    ? readJsonFile<any>(path.join(DATA_DIR, 'news', latestDailyNews), [])
    : [];
  const summaryData = latestSummary
    ? readJsonFile<any>(path.join(DATA_DIR, 'summaries', latestSummary), {})
    : {};
  const trendsData = latestTrends
    ? readJsonFile<GoogleTrendsFile>(path.join(DATA_DIR, 'trends', 'node', latestTrends), {})
    : {};
  const opsData = latestOps ? readJsonFile<OpsLogEntry[]>(path.join(DATA_DIR, 'ops', latestOps), []) : [];
  const phkData = getPHKArticles();
  const researchData = readJsonFile<any[]>(path.join(DATA_DIR, 'research', 'scholar.json'), []);
  const bpsTpt = getBPSTptHistoricalData();
  const asean = getASEANHistoricalData();
  const benchmarkTargets = getBenchmarkTargets();

  const entries: DataInventoryEntry[] = [
    {
      id: 'news-archive',
      label: 'Arsip berita gabungan',
      path: 'data/news/historical-seed.json',
      status: inventoryStatus(latestNewsDate, 2),
      lastUpdated: latestNewsDate,
      records: news.length,
      source: 'Google News RSS + merger harian',
      note: latestDailyNews ? `File harian terbaru: ${latestDailyNews}` : 'Tidak ada file harian.',
    },
    {
      id: 'daily-news',
      label: 'Berita harian',
      path: latestDailyNews ? `data/news/${latestDailyNews}` : 'data/news',
      status: inventoryStatus(newestTimestamp([dailyNewsData[0]?.date, dailyNewsData[0]?._scraped_at]), 2),
      lastUpdated: newestTimestamp([dailyNewsData[0]?.date, dailyNewsData[0]?._scraped_at]),
      records: countRecords(dailyNewsData),
      source: 'Scraper daily news',
      note: latestDailyNews || 'Belum ada file harian.',
    },
    {
      id: 'summaries',
      label: 'Ringkasan Gemini',
      path: latestSummary ? `data/summaries/${latestSummary}` : 'data/summaries',
      status: summaryData.failedBatches > 0 ? 'warning' : inventoryStatus(summaryData.date, 2),
      lastUpdated: summaryData.date,
      records: countRecords(summaryData),
      source: 'Gemini API',
      note: `${summaryData.failedBatches || 0} batch gagal dari ${summaryData.totalArticles || 0} artikel.`,
    },
    {
      id: 'trends',
      label: 'Tren pencarian',
      path: latestTrends ? `data/trends/node/${latestTrends}` : 'data/trends/node',
      status: inventoryStatus(trendsData.fetchedAt, 10),
      lastUpdated: trendsData.fetchedAt,
      records: countRecords(trendsData),
      source: 'Google Trends',
      note: latestTrends ? `${trendsData.keywords?.length || 0} keyword, ${latestTrends}` : 'Belum ada file tren.',
    },
    {
      id: 'ops',
      label: 'Log operasional',
      path: latestOps ? `data/ops/${latestOps}` : 'data/ops',
      status: inventoryStatus(newestTimestamp(opsData.map((entry) => entry.finished_at || entry._scraped_at)), 2),
      lastUpdated: newestTimestamp(opsData.map((entry) => entry.finished_at || entry._scraped_at)),
      records: countRecords(opsData),
      source: 'Ops logger',
      note: latestOps || 'Belum ada log operasional.',
    },
    {
      id: 'phk',
      label: 'Artikel PHK Kemenaker',
      path: 'data/kemenaker/phk/articles.json',
      status: inventoryStatus(newestTimestamp(phkData.map((entry) => entry._scraped_at || entry.date)), 45),
      lastUpdated: newestTimestamp(phkData.map((entry) => entry._scraped_at || entry.date)),
      records: phkData.length,
      source: 'Kemnaker.go.id',
      note: 'Dipakai untuk sinyal PHK resmi dan konteks hubungan industrial.',
    },
    {
      id: 'bps',
      label: 'BPS Sakernas',
      path: 'data/bps/national-tpt-sakernas.json',
      status: bpsTpt?.data?.length ? 'ok' : 'warning',
      lastUpdated: bpsTpt?.data?.at(-1)?.observation_date,
      records: bpsTpt?.data?.length || 0,
      source: bpsTpt?._source_url || 'BPS WebAPI',
      note: 'Seri TPT/TPAK resmi untuk halaman makro.',
    },
    {
      id: 'asean',
      label: 'Panel ASEAN',
      path: 'data/asean/fallback/_by_country.json',
      status: asean?.countries?.length ? 'ok' : 'warning',
      lastUpdated: asean?._scraped_at,
      records: asean?.countries?.length || 0,
      source: asean?._source_url || 'ASEAN/World Bank fallback',
      note: 'Pembanding kawasan untuk halaman Makro ASEAN.',
    },
    {
      id: 'benchmarks',
      label: 'Patokan/target resmi',
      path: 'data/benchmarks/targets.json',
      status: inventoryStatus(benchmarkTargets.length ? '2026-07-05T00:00:00.000Z' : undefined, 400),
      lastUpdated: benchmarkTargets.length ? '2026-07-05T00:00:00.000Z' : undefined,
      records: benchmarkTargets.length,
      source: 'Bappenas RPJMN + World Bank/ILO (dihitung)',
      note: 'Target hand-curated (SDG/RPJMN/ASEAN) untuk reference band; berubah jarang.',
    },
    {
      id: 'research',
      label: 'Riset akademik',
      path: 'data/research/scholar.json',
      status: researchData.length ? 'ok' : 'warning',
      lastUpdated: researchData[0]?.publishDate,
      records: researchData.length,
      source: 'OpenAlex/Crossref/Scholar seed',
      note: 'Daftar studi ketenagakerjaan yang sudah diaudit lokal.',
    },
  ];

  return entries;
}

// --- D1: build-time global ops status for the nav intervention signal ---

export interface GlobalOpsSummary {
  status: HealthStatus;
  // Count of scrapers/data files that are NOT 'ok' -- drives the overview
  // page's "N sumber data perlu dicek" line (D4). Same population as the
  // status rollup below, just also counted instead of only reduced to a
  // worst-case.
  attentionCount: number;
}

/**
 * Worst-status rollup across every scraper's freshness (via
 * getSourceFreshness(), which already routes through the ONE shared
 * evaluateFreshness() rule -- so EXPECTED_PARTIAL sources never surface as
 * "warning" here either) plus the data-file inventory (getDataInventory()),
 * mirroring the same two ingredients OperasionalClient's own overallStatus
 * already combines on /operasional. This is the single source of truth for
 * the nav "Operasional" dot in both Header.tsx and MobileNav.tsx, and for
 * the overview page's "perlu dicek" line -- no second implementation;
 * every consumer reads this one function (or getGlobalOpsSummary() below,
 * which shares the exact same computation) via a prop threaded from the
 * server RootLayout/page (no client-side fetching, no polling: this is a
 * static export, frozen at build time like everything else on this page).
 *
 * `setkab` is excluded (dormant scraper, matches getOpsRuns()/
 * OperasionalClient's own exclusion).
 */
function computeGlobalOpsSummary(): GlobalOpsSummary {
  const metadata = getDashboardMetadata();
  const scraperIds = Object.keys(metadata.scrapers || {}).filter(
    (id) => id.toLowerCase() !== 'setkab'
  );

  const scraperStatuses = scraperIds.map((id) => getSourceFreshness(id).status);
  const inventoryStatuses = getDataInventory().map((entry) => entry.status);

  const allStatuses = [...scraperStatuses, ...inventoryStatuses];
  const attentionCount = allStatuses.filter((status) => status !== 'ok').length;

  let status: HealthStatus = 'ok';
  if (allStatuses.includes('error')) {
    status = 'error';
  } else if (allStatuses.includes('warning')) {
    status = 'warning';
  }

  return { status, attentionCount };
}

export function getGlobalOpsStatus(): HealthStatus {
  return computeGlobalOpsSummary().status;
}

export function getGlobalOpsSummary(): GlobalOpsSummary {
  return computeGlobalOpsSummary();
}
