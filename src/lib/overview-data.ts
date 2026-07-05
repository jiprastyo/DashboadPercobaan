// getSampleBPSData / getSampleNewsData remain as explicit missing-file fallbacks
// (BPS national + news); every other sample surface was purged in Stage 0.
import { getSampleBPSData, getSampleNewsData } from '@/lib/data-loader';
import {
  getASEANHistoricalData,
  getBIPMIData,
  getBPSHistoricalData,
  getBPSNationalData,
  getBPSProvinsiData,
  getDashboardMetadata,
  getGlobalOpsSummary,
  getNewsData,
  getPHKArticles,
  type BIPMISeriesItem,
  type DashboardMetadata,
  type KemenakerPHKArticle,
} from '@/lib/data-loader-server';
import { getAcademicResearch, type ResearchFinding } from '@/data/research';
import { ASEAN_COUNTRIES, type HealthStatus } from '@/lib/constants';
import type { NewsArticle, SourceMetadata } from '@/types';
import type { ASEANCountryData } from '@/types';

export interface OverviewChartPoint extends Record<string, string | number | null> {
  year: string;
  'Pengangguran (%)': number | null;
  'TPAK (%)': number | null;
}

export interface BPSDisplayItem {
  indicator?: string;
  period?: string;
  value?: number;
  change_mom?: number;
  change_yoy?: number;
  _source_url?: string;
}

export interface NewsDisplayArticle extends NewsArticle {
  is_estimated?: boolean;
}

export interface OverviewDashboardData {
  bpsSource: string;
  tptSource: string;
  latestIHK?: BPSDisplayItem;
  latestPMI?: BIPMISeriesItem;
  latestPHK?: KemenakerPHKArticle;
  tptValue: number;
  tptPeriod: string;
  tptSourceUrl: string;
  tptChange?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  ihkSpark: { value: number }[];
  pmiSpark: { value: number }[];
  tptSpark: { value: number }[];
  inflasiSpark: { value: number }[];
  chartData: OverviewChartPoint[];
  chartSourceLabel: string;
  chartSourceUrl: string;
  latestNews: NewsDisplayArticle[];
  kemenakerPHK: KemenakerPHKArticle[];
  generalPHK: NewsDisplayArticle[];
  sourceEntries: SourceMetadata[];
  researchEntries: ResearchFinding[];
  aseanSnapshot: ASEANCountryData[];
  showWarning: boolean;
  // D4: build-time global ops rollup (shared computation with the nav dot
  // via getGlobalOpsSummary() -- no second implementation). Drives the
  // "N sumber data perlu dicek" line; renders nothing when status is 'ok'.
  globalOpsStatus: HealthStatus;
  globalOpsAttentionCount: number;
}

// --- Stage 0 helpers: derive overview snapshots from real committed data ---

// World Bank _by_country.json uses ISO-2 codes; ASEAN_COUNTRIES uses ISO-3.
const WB_TO_ISO3: Record<string, string> = {
  BN: 'BRN', ID: 'IDN', KH: 'KHM', LA: 'LAO', MM: 'MMR',
  MY: 'MYS', PH: 'PHL', SG: 'SGP', TH: 'THA', TL: 'TLS', VN: 'VNM',
};

function latestValue(
  values: Array<{ year: string; value: number | null }> | undefined
): { value: number; period: string } | null {
  if (!values || values.length === 0) {
    return null;
  }
  const usable = values
    .filter((point) => point.value !== null && Number.isFinite(point.value))
    .sort((a, b) => Number(a.year) - Number(b.year));
  const last = usable.at(-1);
  if (!last || last.value === null) {
    return null;
  }
  return { value: last.value, period: last.year };
}

// Overview ASEAN snapshot from the committed World Bank/ILO panel + ASEAN_COUNTRIES
// metadata. Modeled series (World Bank), labeled as such per the source hierarchy.
function buildAseanSnapshot(
  historical: ReturnType<typeof getASEANHistoricalData>
): ASEANCountryData[] {
  if (!historical) {
    return [];
  }
  const byIso3 = new Map(historical.countries.map((c) => [WB_TO_ISO3[c.countryCode] ?? c.countryCode, c]));

  return ASEAN_COUNTRIES.flatMap((meta) => {
    const wb = byIso3.get(meta.country_code);
    if (!wb) {
      return [];
    }
    const unemployment = latestValue(wb.indicators['SL.UEM.TOTL.ZS']?.values);
    const lfpr = latestValue(wb.indicators['SL.TLF.CACT.ZS']?.values);
    if (!unemployment && !lfpr) {
      return [];
    }
    const sourceUrl = historical._source_url;
    const indicators: ASEANCountryData['indicators'] = {};
    if (unemployment) {
      indicators.unemployment_rate = {
        value: unemployment.value,
        period: unemployment.period,
        _source_url: sourceUrl,
      };
    }
    if (lfpr) {
      indicators.lfpr = {
        value: lfpr.value,
        period: lfpr.period,
        _source_url: sourceUrl,
      };
    }
    return [
      {
        ...meta,
        last_updated: historical._scraped_at,
        indicators,
      },
    ];
  });
}

// Overview source metadata from data/_metadata.json (real scraper telemetry),
// mapped into the SourceMetadata shape the UI expects. setkab is excluded.
function buildSourceEntries(metadata: DashboardMetadata): SourceMetadata[] {
  const scrapers = metadata.scrapers || {};
  return Object.entries(scrapers)
    .filter(([source]) => source.toLowerCase() !== 'setkab')
    .map(([source, entry]) => {
      const status = entry.lastStatus?.toLowerCase();
      return {
        source,
        last_fetched: entry.lastFetch || '',
        last_success: entry.lastFetch || '',
        items_total: entry.lastItemsFetched ?? 0,
        status:
          status === 'success' || status === 'ok'
            ? 'ok'
            : status === 'error' || status === 'failed'
              ? 'error'
              : 'warning',
      } satisfies SourceMetadata;
    });
}

export async function getOverviewDashboardData(): Promise<OverviewDashboardData> {
  const nationalRes = getBPSNationalData();
  const provinsiRes = getBPSProvinsiData();
  const kemenakerPHK = getPHKArticles();
  const realNews = getNewsData() as NewsDisplayArticle[];
  const globalOpsSummary = getGlobalOpsSummary();

  const bpsData = (nationalRes ? nationalRes.data : getSampleBPSData()) as BPSDisplayItem[];
  const bpsSource = nationalRes ? nationalRes.source : 'static_seed';
  const tptData = provinsiRes ? provinsiRes.data : [];
  const tptSource = provinsiRes ? provinsiRes.source : 'fallback_spreadsheet';

  const pmiData = getBIPMIData();
  const newsData = realNews.length > 0 ? realNews : (getSampleNewsData() as NewsDisplayArticle[]);
  const historicalData = getASEANHistoricalData();
  const bpsHistorical = getBPSHistoricalData();
  const researchEntries = await getAcademicResearch();
  const aseanSnapshot = buildAseanSnapshot(historicalData);

  let chartData: OverviewChartPoint[] = [];
  let chartSourceLabel = 'World Bank / ILO';
  let chartSourceUrl = historicalData?._source_url || '#';

  if (bpsHistorical && bpsHistorical.data.length > 0) {
    chartSourceLabel = 'BPS (Survei Angkatan Kerja Nasional)';
    chartSourceUrl = bpsHistorical._source_url || 'https://www.bps.go.id/id/pressrelease';
    chartData = bpsHistorical.data.map((item) => ({
      year: item.year,
      'Pengangguran (%)': item.tpt,
      'TPAK (%)': item.tpak,
    }));
  } else if (historicalData) {
    const indonesia = historicalData.countries.find((country) => country.countryName === 'Indonesia');
    if (indonesia) {
      const unemployment = indonesia.indicators['SL.UEM.TOTL.ZS']?.values || [];
      const participation = indonesia.indicators['SL.TLF.CACT.ZS']?.values || [];
      const years = Array.from(new Set([...unemployment.map((item) => item.year), ...participation.map((item) => item.year)])).sort();

      chartData = years.map((year) => ({
        year,
        'Pengangguran (%)': unemployment.find((item) => item.year === year)?.value || null,
        'TPAK (%)': participation.find((item) => item.year === year)?.value || null,
      }));
    }
  }

  const nationalTptRecord = tptData.find((province) => province.province_code === '00');
  let tptValue = 4.82;
  let tptPeriod = 'Rilis: Mei 2026 (Survei: Feb 2026)';
  const tptSourceUrl = 'https://www.bps.go.id/indicator/6/543/1/tingkat-pengangguran-terbuka-menurut-provinsi.htm';
  let tptChange: OverviewDashboardData['tptChange'];

  if (nationalTptRecord) {
    tptValue = nationalTptRecord.tpt_feb_26 !== null ? nationalTptRecord.tpt_feb_26 : 4.82;
    tptPeriod = `Rilis: Feb 2026 (TPT: ${tptValue.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)`;

    if (nationalTptRecord.tpt_feb_26 !== null && nationalTptRecord.tpt_feb_25 !== null) {
      const diff = Number((nationalTptRecord.tpt_feb_26 - nationalTptRecord.tpt_feb_25).toFixed(2));
      tptChange = {
        value: diff,
        label: `${diff > 0 ? '+' : ''}${diff.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pp YoY`,
        direction: diff > 0 ? 'down' : diff < 0 ? 'up' : 'neutral',
      };
    }
  }

  const latestIHK = bpsData.find((item) => item.indicator === 'ihk');
  const latestPMI = pmiData[0];  // real BI PMI series; undefined when scraper has not yet populated it
  const latestPHK = kemenakerPHK[0];

  const ihkSpark = bpsData
    .filter((item) => item.indicator === 'ihk')
    .slice()
    .reverse()
    .map((item) => ({ value: item.value || item.change_mom || 0 }));

  const pmiSpark = pmiData
    .slice()
    .reverse()
    .map((item) => ({ value: item.pmi_value }));

  // Stage 2.4 overview sparklines. TPT: full yearly Sakernas history from
  // national-historical.json (already loaded as bpsHistorical). Inflasi: last 12
  // monthly MtM points from national-indicators.json (bpsData), chronological.
  const tptSpark = (bpsHistorical?.data ?? [])
    .filter((item) => item.tpt !== null && item.tpt !== undefined)
    .map((item) => ({ value: item.tpt }));

  const inflasiSpark = bpsData
    .filter((item) => item.indicator === 'ihk' && typeof item.change_mom === 'number')
    .slice()
    .reverse()
    .slice(-12)
    .map((item) => ({ value: item.change_mom as number }));

  const generalPHK = newsData.filter((article) =>
    article.keywords_matched?.some((keyword: string) => {
      const normalized = keyword.toLowerCase();
      return normalized === 'phk' || normalized.includes('pemutusan hubungan kerja');
    })
  );

  return {
    bpsSource,
    tptSource,
    latestIHK,
    latestPMI,
    latestPHK,
    tptValue,
    tptPeriod,
    tptSourceUrl,
    tptChange,
    ihkSpark,
    pmiSpark,
    tptSpark,
    inflasiSpark,
    chartData,
    chartSourceLabel,
    chartSourceUrl,
    latestNews: newsData.slice(0, 5),
    kemenakerPHK,
    generalPHK,
    sourceEntries: buildSourceEntries(getDashboardMetadata()),
    researchEntries,
    aseanSnapshot,
    showWarning: bpsSource === 'static_seed' || tptSource === 'fallback_spreadsheet',
    globalOpsStatus: globalOpsSummary.status,
    globalOpsAttentionCount: globalOpsSummary.attentionCount,
  };
}
