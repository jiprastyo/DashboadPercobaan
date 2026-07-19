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

function labelForArtifact(raw: RawTrendFile, filename: string) {
  return [raw.week || filename.replace(/\.json$/, ''), raw.geo || 'ID'].filter(Boolean).join(' - ');
}

function mapPoints(result: RawTrendResult | undefined) {
  return (result?.data || [])
    .map((point) => ({
      date: pointDate(point),
      label: point.formattedTime || pointDate(point),
      value: Number(point.value ?? 0),
    }))
    .filter((point) => point.date);
}

/**
 * Resolves one series per keyword independently instead of trusting a
 * single "latest" artifact wholesale. The scraper is a documented
 * silent-success trap (pipeline-debugging §8, google-trends-node): ops
 * reports `success` even when individual keywords come back with
 * `data: []`. Rather than render blank lines for those keywords, walk
 * up to the 8 newest artifacts (newest first) and, per keyword, use the
 * newest artifact that actually has points -- recording which artifact
 * won as `artifactLabel` so the UI can disclose the fallback honestly.
 * The keyword universe itself always comes from the newest artifact.
 */
function getTrendArtifact(): { sourceLabel: string; series: TrendSeries[] } {
  const trendDir = path.join(process.cwd(), 'data', 'trends', 'node');

  if (!fs.existsSync(trendDir)) {
    return { sourceLabel: 'Belum ada artefak tren', series: [] };
  }

  const files = fs
    .readdirSync(trendDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, 8);

  if (files.length === 0) {
    return { sourceLabel: 'Belum ada artefak tren', series: [] };
  }

  const artifacts = files.map((file) => {
    const raw = JSON.parse(fs.readFileSync(path.join(trendDir, file), 'utf-8')) as RawTrendFile;
    return { file, raw, label: labelForArtifact(raw, file) };
  });

  const newest = artifacts[0];
  const sourceLabel = newest.label;
  const keywordUniverse = (newest.raw.results || []).map((result) => result.keyword);

  const series: TrendSeries[] = keywordUniverse.map((keyword) => {
    for (const artifact of artifacts) {
      const result = (artifact.raw.results || []).find((entry) => entry.keyword === keyword);
      if (!result) continue;
      const points = mapPoints(result);
      if (points.length > 0) {
        return {
          keyword,
          averageInterest: result.averageInterest ?? 0,
          regionalInterest: result.regional_interest || result.regionalInterest || {},
          scrapedAt: result._scraped_at || artifact.raw.fetchedAt || '',
          data: points,
          artifactLabel: artifact.label,
        };
      }
    }

    // No data for this keyword in any of the 8 newest artifacts: keep it
    // visible (honest empty state in the UI) rather than dropping it, and
    // attribute it to the newest artifact since that's the one that failed.
    const newestResult = (newest.raw.results || []).find((entry) => entry.keyword === keyword);
    return {
      keyword,
      averageInterest: newestResult?.averageInterest ?? 0,
      regionalInterest: newestResult?.regional_interest || newestResult?.regionalInterest || {},
      scrapedAt: newestResult?._scraped_at || newest.raw.fetchedAt || '',
      data: [],
      artifactLabel: newest.label,
    };
  });

  return { sourceLabel, series };
}

export default function TrenPage() {
  const { sourceLabel, series } = getTrendArtifact();
  const freshness = getSourceFreshness('google-trends-node');
  return <TrenClient sourceLabel={sourceLabel} initialSeries={series} freshness={freshness} />;
}
