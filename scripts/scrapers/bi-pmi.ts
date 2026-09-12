/**
 * scripts/scrapers/bi-pmi.ts — Bank Indonesia PMI-BI Scraper
 *
 * Scrapes BI quarterly press releases for the Prompt Manufacturing Index.
 * Rewritten 2026-09-12: the old scraper targeted BI's survey-report listing
 * (Survei-PMI.aspx) — that page is now a 404 with no data tables, which is
 * why data/bi/pmi/series.json has been [] since 2026-06-07 while the scraper
 * reported success. Real source: press releases under
 * /id/publikasi/ruang-media/news-release/ (e.g. sp_2813926.aspx:
 * "tecermin dari PMI-BI sebesar 51,43%", Triwulan II 2026).
 *
 * The news-release listing only shows the ~7 most recent items and has no
 * reachable pagination/archive (verified 2026-09-12), so a one-time
 * KNOWN_PMI_RELEASE_IDS bootstrap seeds the two quarters discovered during
 * the rebuild; every later quarter is picked up from the listing when fresh.
 *
 * Parsing lives in src/lib/pmi-parser.ts (unit-tested). "PMI" also means
 * Pekerja Migran Indonesia — the parser rejects migrant-worker text.
 */

import * as cheerio from 'cheerio';
import path from 'path';
import {
  BI_PMI,
  fetchWithRetry,
  log,
  writeJSON,
  readJSON,
  ensureDir,
} from '../config';
import { buildPmiSeries, type PmiSeriesItem } from '../../src/lib/pmi-parser';

const LISTING_URL = 'https://www.bi.go.id/id/publikasi/ruang-media/news-release/Default.aspx';
const RELEASE_BASE = 'https://www.bi.go.id/id/publikasi/ruang-media/news-release/Pages/';
const SP_LINK_RE = /sp_\d+\.aspx/i;
const PMI_PAGE_RE = /prompt\s+manufacturing|pmi-bi/i;
const MIGRANT_RE = /pekerja\s+migran|migrant\s+worker/i;

// Quarters discovered during the 2026-09-12 rebuild (BI listing is not
// archived, so historical backfill beyond these is not available from the site).
const KNOWN_PMI_RELEASE_IDS = ['sp_2813926', 'sp_288126'];

/** Extract unique sp_*.aspx links (newest first, DOM order) from a listing page. */
export function extractSpReleaseLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];
  const seen = new Set<string>();
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const match = href.match(/(sp_\d+)\.aspx/i);
    if (!match) {
      return;
    }
    const url = `${RELEASE_BASE}${match[1]}.aspx`;
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  });
  return urls;
}

interface ReleaseRow {
  date?: string;
  title?: string;
  summary?: string;
  link?: string;
}

function extractReleaseDate($: ReturnType<typeof cheerio.load>): string {
  const meta = $('meta[property="article:published_time"]').attr('content');
  if (meta) {
    return meta.slice(0, 10);
  }
  const dm = $('body').text().match(/(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})/i);
  if (!dm) {
    return '';
  }
  const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  const idx = months.indexOf(dm[2].toLowerCase());
  if (idx < 0) {
    return '';
  }
  return `${dm[3]}-${String(idx + 1).padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
}

async function fetchReleaseRow(url: string): Promise<ReleaseRow | null> {
  const res = await fetchWithRetry(url, { redirect: 'follow' });
  const html = await res.text();
  const $ = cheerio.load(html);
  // On release pages the <h1> is the bare page ID (e.g. "sp_2813926"); the
  // real headline lives in <title> ("Prompt Manufacturing Index (PMI) - BI
  // Triwulan II 2026 …"). Prefer whichever carries the headline.
  const pageTitle = $('title').text().trim();
  const h1 = $('h1').first().text().trim();
  const title = pageTitle && !/^sp_\d+$/i.test(pageTitle) ? pageTitle : h1;
  // Filter on the page itself: listing anchors may carry no text.
  if (!PMI_PAGE_RE.test(`${title} ${h1}`) || MIGRANT_RE.test(title)) {
    return null;
  }
  // SharePoint wraps the article in #DeltaPlaceHolderMain; the full body
  // carries ~12k of nav/footer before the text, which used to push the
  // "PMI-BI sebesar X%" sentence out of the slice window.
  const main = $('#DeltaPlaceHolderMain').length ? $('#DeltaPlaceHolderMain') : $('body');
  const body = main.text().replace(/\s+/g, ' ');
  return { date: extractReleaseDate($), title, summary: body.slice(0, 8000), link: url };
}

async function scrapeBIPMI(): Promise<PmiSeriesItem[]> {
  const urls = new Set<string>(KNOWN_PMI_RELEASE_IDS.map((id) => `${RELEASE_BASE}${id}.aspx`));

  try {
    const res = await fetchWithRetry(LISTING_URL, { redirect: 'follow' });
    const html = await res.text();
    for (const url of extractSpReleaseLinks(html)) {
      urls.add(url);
    }
    log('bi-pmi', `Listing + bootstrap: ${urls.size} release pages to check`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('bi-pmi', `Listing fetch failed (${msg}) — falling back to bootstrap IDs only`);
  }

  const rows: ReleaseRow[] = [];
  for (const url of urls) {
    try {
      const row = await fetchReleaseRow(url);
      if (row) {
        rows.push(row);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('bi-pmi', `Release ${url} failed: ${msg}`);
    }
  }

  const items = buildPmiSeries(rows);
  log('bi-pmi', `Parsed ${items.length} quarterly PMI-BI points from ${rows.length} PMI releases`);
  return items;
}

export async function runBIPMI(): Promise<{ total: number; newItems: number; count: number; error?: string }> {
  log('bi-pmi', 'Starting BI PMI scraper (press-release source)');
  const items = await scrapeBIPMI();

  ensureDir(BI_PMI.dataDir);
  const outPath = path.join(BI_PMI.dataDir, 'series.json');

  // Merge with existing by period; scraped items win (fresher _scraped_at).
  const existing = readJSON<PmiSeriesItem[]>(outPath) || [];
  const byPeriod = new Map<string, PmiSeriesItem>();
  for (const item of existing) {
    if (typeof item.pmi_value === 'number') {
      byPeriod.set(item.period, item);
    }
  }
  let newItems = 0;
  for (const item of items) {
    if (!byPeriod.has(item.period)) {
      newItems++;
    }
    byPeriod.set(item.period, item);
  }

  const merged = Array.from(byPeriod.values()).sort((a, b) => b.period.localeCompare(a.period));
  writeJSON(outPath, merged);
  log('bi-pmi', `${newItems} new quarters, ${merged.length} total`);

  // Empty result must surface as a problem, not silent success: withOpsLog
  // turns a returned `error` into status "partial" so /operasional shows it.
  const result: { total: number; newItems: number; count: number; error?: string } = {
    total: merged.length,
    newItems,
    count: merged.length,
  };
  if (merged.length === 0) {
    result.error = 'no PMI-BI releases found';
  }
  return result;
}

// Run directly
if (require.main === module) {
  runBIPMI()
    .then((result) => {
      log('bi-pmi', `Done. ${JSON.stringify(result)}`);
      if (result.error) {
        process.exit(1);
      }
    })
    .catch((err) => {
      log('bi-pmi', `Fatal error: ${err}`);
      process.exit(1);
    });
}
