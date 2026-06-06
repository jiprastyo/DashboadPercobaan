/**
 * scripts/scrapers/google-trends-node.ts — Google Trends (Node.js)
 * Uses google-trends-api npm package to fetch interest over time for labor keywords.
 */

import path from 'path';
import {
  GOOGLE_TRENDS,
  RATE_LIMIT,
  log,
  timestamp,
  getISOWeek,
  writeJSON,
  ensureDir,
  delay,
} from '../config';

// google-trends-api uses CommonJS
const googleTrends = require('google-trends-api');

interface TrendDataPoint {
  keyword: string;
  time: string;
  value: number;
  formattedTime: string;
}

interface TrendResult {
  keyword: string;
  data: TrendDataPoint[];
  averageInterest: number;
  _source_url: string;
  _scraped_at: string;
}

async function fetchTrendForKeyword(keyword: string): Promise<TrendResult> {
  log('google-trends-node', `Querying: "${keyword}"`);
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3); // Last 3 months

  try {
    const rawResult = await googleTrends.interestOverTime({
      keyword,
      startTime: startDate,
      endTime: endDate,
      geo: GOOGLE_TRENDS.geo,
    });

    const parsed = JSON.parse(rawResult);
    const timelineData = parsed.default?.timelineData || [];

    const dataPoints: TrendDataPoint[] = timelineData.map((entry: {
      time: string;
      formattedTime: string;
      value: number[];
    }) => ({
      keyword,
      time: entry.time,
      formattedTime: entry.formattedTime,
      value: entry.value?.[0] ?? 0,
    }));

    const avgInterest =
      dataPoints.length > 0
        ? Math.round(dataPoints.reduce((s, d) => s + d.value, 0) / dataPoints.length)
        : 0;

    return {
      keyword,
      data: dataPoints,
      averageInterest: avgInterest,
      _source_url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}&geo=ID`,
      _scraped_at: timestamp(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('google-trends-node', `Error for "${keyword}": ${msg}`);
    return {
      keyword,
      data: [],
      averageInterest: 0,
      _source_url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}&geo=ID`,
      _scraped_at: timestamp(),
    };
  }
}

export async function scrapeGoogleTrendsNode(): Promise<{ total: number; keywords: number }> {
  log('google-trends-node', 'Starting Google Trends (Node) scraper');
  const results: TrendResult[] = [];

  for (const keyword of GOOGLE_TRENDS.keywords) {
    const result = await fetchTrendForKeyword(keyword);
    results.push(result);
    log(
      'google-trends-node',
      `"${keyword}": ${result.data.length} data points, avg=${result.averageInterest}`,
    );
    // Respect rate limit
    await delay(RATE_LIMIT.googleTrendsDelayMs);
  }

  // Save with ISO week filename
  const weekStr = getISOWeek(new Date());
  ensureDir(GOOGLE_TRENDS.nodeDataDir);
  const outPath = path.join(GOOGLE_TRENDS.nodeDataDir, `${weekStr}.json`);

  const output = {
    week: weekStr,
    fetchedAt: timestamp(),
    keywords: GOOGLE_TRENDS.keywords,
    geo: GOOGLE_TRENDS.geo,
    results,
    _source_url: 'https://trends.google.com/trends/',
    _scraped_at: timestamp(),
  };

  writeJSON(outPath, output);
  log('google-trends-node', `Saved to ${outPath}`);

  return { total: results.reduce((s, r) => s + r.data.length, 0), keywords: results.length };
}

// Run directly
if (require.main === module) {
  scrapeGoogleTrendsNode()
    .then((result) => {
      log('google-trends-node', `Done. ${JSON.stringify(result)}`);
    })
    .catch((err) => {
      log('google-trends-node', `Fatal error: ${err}`);
      process.exit(1);
    });
}
