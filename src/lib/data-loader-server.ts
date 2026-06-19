import fs from 'fs';
import path from 'path';

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
  results?: GoogleTrendResult[];
}

export interface TrendChartSeries {
  keyword: string;
  data: Array<{
    date: string;
    value: number;
  }>;
}

function isValidTrendResult(series: GoogleTrendResult): series is GoogleTrendResult & { keyword: string; data: GoogleTrendPoint[] } {
  return Boolean(series.keyword && series.data?.length);
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

export function getGoogleTrendsData(): TrendChartSeries[] {
  try {
    const trendsDir = path.join(DATA_DIR, 'trends', 'node');
    if (!fs.existsSync(trendsDir)) {
      return [];
    }

    const latestFile = fs
      .readdirSync(trendsDir)
      .filter((fileName) => fileName.endsWith('.json'))
      .sort()
      .at(-1);

    if (!latestFile) {
      return [];
    }

    const rawData = fs.readFileSync(path.join(trendsDir, latestFile), 'utf-8');
    const trendsFile = JSON.parse(rawData) as GoogleTrendsFile;

    return (trendsFile.results || [])
      .filter(isValidTrendResult)
      .map((series) => ({
        keyword: series.keyword,
        data: (series.data || []).map((point) => ({
          date: point.formattedTime || (point.time ? new Date(Number(point.time) * 1000).toISOString().slice(0, 10) : ''),
          value: point.value || 0,
        })),
      }));
  } catch (error) {
    console.error('Error reading Google Trends data:', error);
    return [];
  }
}
