/**
 * scripts/scrapers/kemenaker.ts — Kemenaker PHK Scraper
 * Uses the internal JSON API to bypass the Angular SPA and retrieve "Siaran Pers" articles.
 * Filters for PHK-related content using regex keywords.
 */

import path from 'path';
import * as cheerio from 'cheerio';
import {
  KEMENAKER,
  fetchWithRetry,
  log,
  matchesKeywords,
  writeJSON,
  readJSON,
  delay,
  RATE_LIMIT,
  ensureDir,
} from '../config';

interface KemenakerArticle {
  title: string;
  date: string;
  summary: string;
  link: string;
  _source_url: string;
  _scraped_at: string;
}

const API_BASE_URL = 'https://portal.kemnaker.go.id/api/v1/news';

export async function scrapeKemenaker(): Promise<{ total: number; newItems: number }> {
  log('kemenaker', 'Starting Kemenaker API scraper');
  const allArticles: KemenakerArticle[] = [];

  // Scrape up to 30 pages to fetch recent history
  // The API uses ?page=1, ?page=2, etc.
  for (let page = 1; page <= 30; page++) {
    const pageUrl = `${API_BASE_URL}?page=${page}`;
    log('kemenaker', `Fetching API ${pageUrl}`);
    
    try {
      const res = await fetchWithRetry(pageUrl);
      const json = await res.json() as any;

      if (!json || !json.data || json.data.length === 0) {
        log('kemenaker', 'No more data found, stopping pagination.');
        break;
      }

      for (const item of json.data) {
        const cleanBody = cheerio.load(item.body || '').root().text().trim().replace(/\s+/g, ' ');
        const combinedText = `${item.title} ${cleanBody}`;

        // Filter for PHK
        if (matchesKeywords(combinedText, KEMENAKER.phkKeywords)) {
          allArticles.push({
            title: item.title,
            date: item.created_at.split(' ')[0], // Extract YYYY-MM-DD
            summary: cleanBody.substring(0, 500) + '...',
            link: item.url,
            _source_url: item.url,
            _scraped_at: new Date().toISOString(),
          });
        }
      }
      await delay(RATE_LIMIT.defaultDelayMs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('kemenaker', `Error scraping API page ${page}: ${msg}`);
      break; // Stop on serious error to prevent infinite loops
    }
  }

  // Deduplicate by link
  const seen = new Set<string>();
  const unique = allArticles.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  // Merge with existing data
  ensureDir(KEMENAKER.dataDir);
  const outPath = path.join(KEMENAKER.dataDir, 'articles.json');
  const existing = readJSON<KemenakerArticle[]>(outPath) || [];
  const existingLinks = new Set(existing.map((e) => e.link));
  
  const newItems = unique.filter((i) => !existingLinks.has(i.link));
  const merged = [...existing, ...newItems];

  // Sort strictly by date descending
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  writeJSON(outPath, merged);
  log('kemenaker', `${newItems.length} new, ${merged.length} total PHK articles`);

  return { total: merged.length, newItems: newItems.length };
}

// Run directly
if (require.main === module) {
  scrapeKemenaker()
    .then((result) => {
      log('kemenaker', `Done. ${JSON.stringify(result)}`);
    })
    .catch((err) => {
      log('kemenaker', `Fatal error: ${err}`);
      process.exit(1);
    });
}
