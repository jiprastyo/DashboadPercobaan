import fs from 'fs';
import path from 'path';
import TrenClient, { type TrendSeries } from './TrenClient';
import { getSourceFreshness } from '@/lib/data-loader-server';

interface RawTrendPoint {
  time?: string;
  formattedTime?: string;
  value?: number;
}

interface RawTrendResult {
  keyword: string;
  data?: RawTrendPoint[];
  averageInterest?: number;
  regional_interest?: Record<string, number>;
  regionalInterest?: Record<string, number>;
  _scraped_at?: string;
}

interface RawTrendFile {
  week?: string;
  fetchedAt?: string;
  geo?: string;
  results?: RawTrendResult[];
}

function pointDate(point: RawTrendPoint) {
  if (point.time && /^\d+$/.test(point.time)) {
    return new Date(Number(point.time) * 1000).toISOString().slice(0, 10);
  }
  return point.formattedTime || '';
}

function getTrendArtifact(): { sourceLabel: string; series: TrendSeries[] } {
  const trendDir = path.join(process.cwd(), 'data', 'trends', 'node');

  if (!fs.existsSync(trendDir)) {
    return { sourceLabel: 'Belum ada artefak tren', series: [] };
  }

  const latestFile = fs
    .readdirSync(trendDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .at(-1);

  if (!latestFile) {
    return { sourceLabel: 'Belum ada artefak tren', series: [] };
  }

  const raw = JSON.parse(fs.readFileSync(path.join(trendDir, latestFile), 'utf-8')) as RawTrendFile;
  const sourceLabel = [raw.week || latestFile.replace(/\.json$/, ''), raw.geo || 'ID'].filter(Boolean).join(' - ');

  return {
    sourceLabel,
    series: (raw.results || []).map((result) => ({
      keyword: result.keyword,
      averageInterest: result.averageInterest ?? 0,
      regionalInterest: result.regional_interest || result.regionalInterest || {},
      scrapedAt: result._scraped_at || raw.fetchedAt || '',
      data: (result.data || [])
        .map((point) => ({
          date: pointDate(point),
          label: point.formattedTime || pointDate(point),
          value: Number(point.value ?? 0),
        }))
        .filter((point) => point.date),
    })),
  };
}

export default function TrenPage() {
  const { sourceLabel, series } = getTrendArtifact();
  const freshness = getSourceFreshness('google-trends-node');
  return <TrenClient sourceLabel={sourceLabel} initialSeries={series} freshness={freshness} />;
}
