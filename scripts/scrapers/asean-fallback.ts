/**
 * scripts/scrapers/asean-fallback.ts — ILO/World Bank Fallback Data
 * Fetches unemployment rate, labor force participation, employment ratio,
 * and youth unemployment from the World Bank API for all ASEAN countries.
 */

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
} from '../config';

interface WBIndicatorResult {
  indicatorCode: string;
  indicatorName: string;
  data: WBDataPoint[];
  _source_url: string;
  _scraped_at: string;
  error?: string;
}

interface WBDataPoint {
  country: { id: string; value: string };
  indicator: { id: string; value: string };
  date: string;
  value: number | null;
}

async function fetchIndicator(
  indicatorCode: string,
  indicatorName: string,
): Promise<WBIndicatorResult> {
  const url =
    `${WORLD_BANK.baseUrl}/country/${WORLD_BANK.countries}/indicator/${indicatorCode}` +
    `?format=json&date=${WORLD_BANK.dateRange}&per_page=${WORLD_BANK.perPage}`;

  log('asean-fallback', `Fetching indicator: ${indicatorCode} (${indicatorName})`);

  try {
    const res = await fetchWithRetry(url);
    const json = await res.json();

    // World Bank API returns [metadata, data[]]
    if (!Array.isArray(json) || json.length < 2) {
      log('asean-fallback', `Unexpected response format for ${indicatorCode}`);
      return {
        indicatorCode,
        indicatorName,
        data: [],
        _source_url: url,
        _scraped_at: timestamp(),
        error: 'Unexpected response format',
      };
    }

    const metadata = json[0] as { page: number; pages: number; total: number };
    const rawData = json[1] as Array<{
      country: { id: string; value: string };
      indicator: { id: string; value: string };
      date: string;
      value: number | null;
    }>;

    const data: WBDataPoint[] = (rawData || []).map((entry) => ({
      country: entry.country,
      indicator: entry.indicator,
      date: entry.date,
      value: entry.value,
    }));

    log(
      'asean-fallback',
      `${indicatorCode}: ${data.length} data points (page ${metadata.page}/${metadata.pages})`,
    );

    return {
      indicatorCode,
      indicatorName,
      data,
      _source_url: url,
      _scraped_at: timestamp(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('asean-fallback', `Error fetching ${indicatorCode}: ${msg}`);
    return {
      indicatorCode,
      indicatorName,
      data: [],
      _source_url: url,
      _scraped_at: timestamp(),
      error: msg,
    };
  }
}

export async function scrapeASEANFallback(): Promise<{
  indicators: number;
  totalDataPoints: number;
}> {
  log('asean-fallback', 'Starting World Bank / ILO fallback scraper');
  ensureDir(WORLD_BANK.dataDir);

  const allResults: WBIndicatorResult[] = [];
  let totalDataPoints = 0;

  for (const indicator of WORLD_BANK.indicators) {
    const result = await fetchIndicator(indicator.code, indicator.name);
    allResults.push(result);
    totalDataPoints += result.data.length;

    // Save per-indicator file
    const outPath = path.join(WORLD_BANK.dataDir, `${indicator.code}.json`);
    writeJSON(outPath, result);

    await delay(RATE_LIMIT.defaultDelayMs);
  }

  // Also create a combined by-country view
  const countryMap: Record<
    string,
    {
      countryCode: string;
      countryName: string;
      indicators: Record<
        string,
        { name: string; values: Array<{ year: string; value: number | null }> }
      >;
    }
  > = {};

  for (const result of allResults) {
    for (const dp of result.data) {
      const code = dp.country.id;
      if (!countryMap[code]) {
        countryMap[code] = {
          countryCode: code,
          countryName: dp.country.value,
          indicators: {},
        };
      }
      if (!countryMap[code].indicators[result.indicatorCode]) {
        countryMap[code].indicators[result.indicatorCode] = {
          name: result.indicatorName,
          values: [],
        };
      }
      countryMap[code].indicators[result.indicatorCode].values.push({
        year: dp.date,
        value: dp.value,
      });
    }
  }

  // Save by-country combined file
  const byCountryPath = path.join(WORLD_BANK.dataDir, '_by_country.json');
  writeJSON(byCountryPath, {
    countries: Object.values(countryMap),
    _source_url: `${WORLD_BANK.baseUrl}/country/${WORLD_BANK.countries}`,
    _scraped_at: timestamp(),
  });

  // Save summary
  const summaryPath = path.join(WORLD_BANK.dataDir, '_summary.json');
  writeJSON(summaryPath, {
    fetchedAt: timestamp(),
    indicators: allResults.map((r) => ({
      code: r.indicatorCode,
      name: r.indicatorName,
      dataPoints: r.data.length,
      success: !r.error,
      error: r.error || null,
    })),
    totalDataPoints,
    countries: WORLD_BANK.countries.split(';'),
    dateRange: WORLD_BANK.dateRange,
    _source_url: WORLD_BANK.baseUrl,
    _scraped_at: timestamp(),
  });

  log('asean-fallback', `Done. ${allResults.length} indicators, ${totalDataPoints} total data points`);
  return { indicators: allResults.length, totalDataPoints };
}

// Run directly
if (require.main === module) {
  scrapeASEANFallback()
    .then((result) => {
      log('asean-fallback', `Done. ${JSON.stringify(result)}`);
    })
    .catch((err) => {
      log('asean-fallback', `Fatal error: ${err}`);
      process.exit(1);
    });
}
