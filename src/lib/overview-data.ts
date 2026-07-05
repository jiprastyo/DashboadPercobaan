import {
  getSampleASEANData,
  getSampleBPSData,
  getSampleMetadata,
  getSampleNewsData,
  getSamplePHKData,
  getSampleSummaries,
} from '@/lib/data-loader';
import {
  getASEANHistoricalData,
  getBIPMIData,
  getBPSHistoricalData,
  getBPSNationalData,
  getBPSProvinsiData,
  getNewsData,
  getPHKArticles,
  type BIPMISeriesItem,
  type KemenakerPHKArticle,
} from '@/lib/data-loader-server';
import { getAcademicResearch, type ResearchFinding } from '@/data/research';
import type { ArticleSummary, MetadataFile, NewsArticle, PHKArticle, SourceMetadata } from '@/types';
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
  latestPHK?: PHKArticle;
  tptValue: number;
  tptPeriod: string;
  tptChange?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  ihkSpark: { value: number }[];
  pmiSpark: { value: number }[];
  chartData: OverviewChartPoint[];
  chartSourceLabel: string;
  chartSourceUrl: string;
  latestNews: NewsDisplayArticle[];
  kemenakerPHK: KemenakerPHKArticle[];
  generalPHK: NewsDisplayArticle[];
  summaries: ArticleSummary[];
  sourceEntries: SourceMetadata[];
  researchEntries: ResearchFinding[];
  aseanSnapshot: ASEANCountryData[];
  showWarning: boolean;
}

export async function getOverviewDashboardData(): Promise<OverviewDashboardData> {
  const nationalRes = getBPSNationalData();
  const provinsiRes = getBPSProvinsiData();
  const kemenakerPHK = getPHKArticles();
  const realNews = getNewsData() as NewsDisplayArticle[];

  const bpsData = (nationalRes ? nationalRes.data : getSampleBPSData()) as BPSDisplayItem[];
  const bpsSource = nationalRes ? nationalRes.source : 'static_seed';
  const tptData = provinsiRes ? provinsiRes.data : [];
  const tptSource = provinsiRes ? provinsiRes.source : 'fallback_spreadsheet';

  const pmiData = getBIPMIData();
  const phkData = getSamplePHKData();
  const newsData = realNews.length > 0 ? realNews : (getSampleNewsData() as NewsDisplayArticle[]);
  const metadata: MetadataFile = getSampleMetadata();
  const summaries = getSampleSummaries();
  const historicalData = getASEANHistoricalData();
  const bpsHistorical = getBPSHistoricalData();
  const researchEntries = await getAcademicResearch();
  const aseanSnapshot = getSampleASEANData();

  let chartData: OverviewChartPoint[] = [];
  let chartSourceLabel = 'World Bank / ILO';
  let chartSourceUrl = historicalData?._source_url || '#';

  if (bpsHistorical && bpsHistorical.data.length > 0) {
    chartSourceLabel = 'BPS (Survei Angkatan Kerja Nasional)';
    chartSourceUrl = bpsHistorical._source_url || 'https://www.bps.go.id';
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
  const latestPHK = phkData[0];

  const ihkSpark = bpsData
    .filter((item) => item.indicator === 'ihk')
    .slice()
    .reverse()
    .map((item) => ({ value: item.value || item.change_mom || 0 }));

  const pmiSpark = pmiData
    .slice()
    .reverse()
    .map((item) => ({ value: item.pmi_value }));

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
    tptChange,
    ihkSpark,
    pmiSpark,
    chartData,
    chartSourceLabel,
    chartSourceUrl,
    latestNews: newsData.slice(0, 5),
    kemenakerPHK,
    generalPHK,
    summaries,
    sourceEntries: Object.values(metadata.sources),
    researchEntries,
    aseanSnapshot,
    showWarning: bpsSource === 'static_seed' || tptSource === 'fallback_spreadsheet',
  };
}
