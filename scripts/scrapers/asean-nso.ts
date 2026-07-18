/**
 * scripts/scrapers/asean-nso.ts — ASEAN National Statistics Office Scrapers
 * Fetches labor force data from ASEAN NSOs via APIs and HTML scraping.
 */

import * as cheerio from 'cheerio';
import path from 'path';
import {
  ASEAN_COUNTRIES,
  ASEAN_NSO,
  fetchWithRetry,
  log,
  timestamp,
  writeJSON,
  ensureDir,
  delay,
  RATE_LIMIT,
  FETCH_HEADERS,
} from '../config';

interface NSODataResult {
  country: string;
  countryCode: string;
  nsoName: string;
  data: unknown[];
  metadata: Record<string, unknown>;
  _source_url: string;
  _scraped_at: string;
  error?: string;
}

// ─── Malaysia (DOSM) ─────────────────────────────────────────────────────────
async function fetchMalaysia(): Promise<NSODataResult> {
  const country = ASEAN_COUNTRIES.find((c) => c.code === 'MYS')!;
  log('asean-nso', `Fetching Malaysia (DOSM) data`);

  try {
    const res = await fetchWithRetry(country.apiUrl!, {
      headers: { ...FETCH_HEADERS, Accept: 'application/json' },
    });
    const json = await res.json() as unknown[];

    // data.gov.my returns array of objects
    const data = Array.isArray(json) ? json : [];
    log('asean-nso', `Malaysia: ${data.length} records`);

    return {
      country: country.name,
      countryCode: country.code,
      nsoName: country.nsoName,
      data: data.slice(0, 500), // Cap at 500 records
      metadata: { totalRecords: data.length, apiEndpoint: country.apiUrl },
      _source_url: country.apiUrl!,
      _scraped_at: timestamp(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('asean-nso', `Malaysia error: ${msg}`);
    return {
      country: country.name,
      countryCode: country.code,
      nsoName: country.nsoName,
      data: [],
      metadata: { error: msg },
      _source_url: country.apiUrl!,
      _scraped_at: timestamp(),
      error: msg,
    };
  }
}

// ─── Singapore (SingStat / Data.gov.sg) ──────────────────────────────────────
async function fetchSingapore(): Promise<NSODataResult> {
  const country = ASEAN_COUNTRIES.find((c) => c.code === 'SGP')!;
  log('asean-nso', `Fetching Singapore (SingStat) data`);

  try {
    const res = await fetchWithRetry(country.apiUrl!, {
      headers: { ...FETCH_HEADERS, Accept: 'application/json' },
    });
    const json = await res.json() as { result?: { records?: unknown[]; total?: number } };

    const records = json?.result?.records || [];
    log('asean-nso', `Singapore: ${records.length} records`);

    return {
      country: country.name,
      countryCode: country.code,
      nsoName: country.nsoName,
      data: records,
      metadata: {
        totalRecords: json?.result?.total || records.length,
        apiEndpoint: country.apiUrl,
      },
      _source_url: country.apiUrl!,
      _scraped_at: timestamp(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('asean-nso', `Singapore error: ${msg}`);
    return {
      country: country.name,
      countryCode: country.code,
      nsoName: country.nsoName,
      data: [],
      metadata: { error: msg },
      _source_url: country.apiUrl!,
      _scraped_at: timestamp(),
      error: msg,
    };
  }
}

// ─── Philippines (PSA OpenSTAT PXWeb) ────────────────────────────────────────
async function fetchPhilippines(): Promise<NSODataResult> {
  const country = ASEAN_COUNTRIES.find((c) => c.code === 'PHL')!;
  log('asean-nso', `Fetching Philippines (PSA) data`);

  try {
    // PXWeb API: first get metadata, then query data
    const metaRes = await fetchWithRetry(country.apiUrl!, {
      headers: { ...FETCH_HEADERS, Accept: 'application/json' },
    });
    const metaJson = await metaRes.json() as {
      variables?: Array<{
        code: string;
        text: string;
        values: string[];
        valueTexts: string[];
      }>;
    };

    const variables = metaJson?.variables || [];
    log('asean-nso', `Philippines: ${variables.length} variables in metadata`);

    // Build a simple POST query for latest data
    const queryBody: Record<string, unknown> = {
      query: variables.map((v) => ({
        code: v.code,
        selection: {
          filter: 'top',
          values: ['10'], // Latest 10 items per variable
        },
      })),
      response: { format: 'json' },
    };

    try {
      const dataRes = await fetchWithRetry(country.apiUrl!, {
        method: 'POST',
        headers: {
          ...FETCH_HEADERS,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(queryBody),
      });
      const dataJson = await dataRes.json() as { data?: unknown[] };
      const data = dataJson?.data || [];
      log('asean-nso', `Philippines: ${data.length} data points`);

      return {
        country: country.name,
        countryCode: country.code,
        nsoName: country.nsoName,
        data,
        metadata: {
          variables: variables.map((v) => ({ code: v.code, text: v.text })),
          apiEndpoint: country.apiUrl,
        },
        _source_url: country.apiUrl!,
        _scraped_at: timestamp(),
      };
    } catch (queryErr: unknown) {
      // If POST fails, return metadata
      return {
        country: country.name,
        countryCode: country.code,
        nsoName: country.nsoName,
        data: [],
        metadata: {
          variables: variables.map((v) => ({
            code: v.code,
            text: v.text,
            valueCount: v.values?.length,
          })),
          note: 'Data query failed, metadata only',
        },
        _source_url: country.apiUrl!,
        _scraped_at: timestamp(),
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('asean-nso', `Philippines error: ${msg}`);
    return {
      country: country.name,
      countryCode: country.code,
      nsoName: country.nsoName,
      data: [],
      metadata: { error: msg },
      _source_url: country.apiUrl!,
      _scraped_at: timestamp(),
      error: msg,
    };
  }
}

// ─── HTML scraper fallback (Thailand, Vietnam, Myanmar, Cambodia, Laos, Brunei)
async function fetchHTMLCountry(countryCode: string): Promise<NSODataResult> {
  const country = ASEAN_COUNTRIES.find((c) => c.code === countryCode)!;
  const url = country.htmlUrl || country.apiUrl || '';
  log('asean-nso', `Fetching ${country.name} (${country.nsoName}) via HTML`);

  if (!url) {
    return {
      country: country.name,
      countryCode: country.code,
      nsoName: country.nsoName,
      data: [],
      metadata: { note: 'No URL configured' },
      _source_url: '',
      _scraped_at: timestamp(),
      error: 'No URL configured',
    };
  }

  try {
    const res = await fetchWithRetry(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract structured data from tables
    const tables: Array<{ headers: string[]; rows: string[][] }> = [];
    $('table').each((_, table) => {
      const headers: string[] = [];
      $(table).find('thead th, tr:first-child th').each((_, th) => {
        headers.push($(th).text().trim());
      });

      const rows: string[][] = [];
      $(table).find('tbody tr, tr:not(:first-child)').each((_, row) => {
        const cells: string[] = [];
        $(row).find('td').each((_, td) => {
          cells.push($(td).text().trim());
        });
        if (cells.length > 0) rows.push(cells);
      });

      if (rows.length > 0) {
        tables.push({ headers, rows });
      }
    });

    // Extract relevant links
    const links: Array<{ text: string; href: string }> = [];
    $('a').each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      const href = $(el).attr('href') || '';
      if (
        href &&
        (text.includes('labor') ||
          text.includes('labour') ||
          text.includes('employment') ||
          text.includes('unemployment') ||
          text.includes('workforce') ||
          text.includes('lao dong') ||     // Vietnamese
          text.includes('แรงงาน') ||        // Thai
          text.includes('buruh'))
      ) {
        const fullHref = href.startsWith('http') ? href : `${url.replace(/\/$/, '')}/${href.replace(/^\//, '')}`;
        links.push({ text: $(el).text().trim(), href: fullHref });
      }
    });

    // Extract page title and meta description
    const pageTitle = $('title').text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';

    log('asean-nso', `${country.name}: ${tables.length} tables, ${links.length} relevant links`);

    return {
      country: country.name,
      countryCode: country.code,
      nsoName: country.nsoName,
      data: tables.length > 0 ? tables : links,
      metadata: {
        pageTitle,
        metaDescription: metaDesc,
        tablesFound: tables.length,
        relevantLinksFound: links.length,
        sourceUrl: url,
      },
      _source_url: url,
      _scraped_at: timestamp(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('asean-nso', `${country.name} error: ${msg}`);
    return {
      country: country.name,
      countryCode: country.code,
      nsoName: country.nsoName,
      data: [],
      metadata: { error: msg, note: `Failed to scrape ${country.nsoName}` },
      _source_url: url,
      _scraped_at: timestamp(),
      error: msg,
    };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
export async function scrapeASEANNSO(): Promise<{ countries: number; successCount: number }> {
  log('asean-nso', 'Starting ASEAN NSO scraper');
  ensureDir(ASEAN_NSO.dataDir);

  const results: NSODataResult[] = [];
  let successCount = 0;

  // API-based countries
  const malaysia = await fetchMalaysia();
  results.push(malaysia);
  if (!malaysia.error) successCount++;
  await delay(RATE_LIMIT.defaultDelayMs);

  const singapore = await fetchSingapore();
  results.push(singapore);
  if (!singapore.error) successCount++;
  await delay(RATE_LIMIT.defaultDelayMs);

  const philippines = await fetchPhilippines();
  results.push(philippines);
  if (!philippines.error) successCount++;
  await delay(RATE_LIMIT.defaultDelayMs);

  // HTML-based countries
  const htmlCountries = ['THA', 'VNM', 'MMR', 'KHM', 'LAO', 'BRN'];
  for (const code of htmlCountries) {
    const result = await fetchHTMLCountry(code);
    results.push(result);
    if (!result.error) successCount++;
    await delay(RATE_LIMIT.defaultDelayMs);
  }

  // Save per-country files
  for (const result of results) {
    const outPath = path.join(ASEAN_NSO.dataDir, `${result.countryCode.toLowerCase()}.json`);
    writeJSON(outPath, result);
  }

  // Save summary
  const summaryPath = path.join(ASEAN_NSO.dataDir, '_summary.json');
  writeJSON(summaryPath, {
    fetchedAt: timestamp(),
    countries: results.map((r) => ({
      code: r.countryCode,
      name: r.country,
      nso: r.nsoName,
      dataCount: Array.isArray(r.data) ? r.data.length : 0,
      success: !r.error,
      error: r.error || null,
    })),
    _source_url: 'ASEAN NSO Multiple Sources',
    _scraped_at: timestamp(),
  });

  log('asean-nso', `Done. ${successCount}/${results.length} countries succeeded`);
  return { countries: results.length, successCount };
}

// Run directly
if (require.main === module) {
  scrapeASEANNSO()
    .then((result) => {
      log('asean-nso', `Done. ${JSON.stringify(result)}`);
    })
    .catch((err) => {
      log('asean-nso', `Fatal error: ${err}`);
      process.exit(1);
    });
}
