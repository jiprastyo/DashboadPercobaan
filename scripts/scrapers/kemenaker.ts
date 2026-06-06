/**
 * scripts/scrapers/kemenaker.ts — Kemenaker PHK Scraper
 * Scrapes https://kemnaker.go.id/news/categories/siaran-pers
 * Filters for PHK-related articles and saves them.
 */

import * as cheerio from 'cheerio';
import path from 'path';
import {
  KEMENAKER,
  fetchWithRetry,
  log,
  matchesKeywords,
  timestamp,
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

async function scrapeKemenakerPage(pageUrl: string): Promise<KemenakerArticle[]> {
  log('kemenaker', `Fetching ${pageUrl}`);
  const res = await fetchWithRetry(pageUrl);
  const html = await res.text();
  const $ = cheerio.load(html);
  const articles: KemenakerArticle[] = [];

  // Try multiple selectors for the Kemenaker news listing
  const containerSelectors = [
    '.news-item',
    '.card',
    'article',
    '.list-group-item',
    '.post-item',
    '.col-md-6',
    '.col-lg-4',
  ];

  let $items = $([]);
  for (const sel of containerSelectors) {
    const found = $(sel);
    if (found.length >= 2) {
      $items = found;
      log('kemenaker', `Matched selector: "${sel}" (${found.length} items)`);
      break;
    }
  }

  // Fallback: scan links
  if ($items.length === 0) {
    log('kemenaker', 'No structured items found, falling back to link scan');
    $('a').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const text = $el.text().trim();
      if (text.length > 15 && (href.includes('/news/') || href.includes('/detail/'))) {
        const fullLink = href.startsWith('http')
          ? href
          : `https://kemnaker.go.id${href}`;
        if (matchesKeywords(text, KEMENAKER.phkKeywords)) {
          articles.push({
            title: text,
            date: '',
            summary: '',
            link: fullLink,
            _source_url: fullLink,
            _scraped_at: timestamp(),
          });
        }
      }
    });
    return articles;
  }

  $items.each((_, el) => {
    const $el = $(el);
    const titleEl = $el.find('a, h3, h4, h5, .news-title, .card-title').first();
    const title = titleEl.text().trim();
    if (!title || title.length < 10) return;

    let link = titleEl.attr('href') || $el.find('a').first().attr('href') || '';
    if (link && !link.startsWith('http')) {
      link = `https://kemnaker.go.id${link}`;
    }

    const dateEl = $el.find('time, .date, .text-muted, small, .news-date').first();
    const date = dateEl.text().trim() || dateEl.attr('datetime') || '';

    const summaryEl = $el.find('p, .description, .card-text, .news-desc').first();
    const summary = summaryEl.text().trim().slice(0, 500);

    const combinedText = `${title} ${summary}`;

    if (matchesKeywords(combinedText, KEMENAKER.phkKeywords)) {
      articles.push({
        title,
        date,
        summary,
        link,
        _source_url: link || pageUrl,
        _scraped_at: timestamp(),
      });
    }
  });

  return articles;
}

export async function scrapeKemenaker(): Promise<{ total: number; newItems: number }> {
  log('kemenaker', 'Starting Kemenaker PHK scraper');
  const allArticles: KemenakerArticle[] = [];

  // Scrape main page and a couple paginated pages
  const pages = [
    KEMENAKER.baseUrl,
    `${KEMENAKER.baseUrl}?page=2`,
    `${KEMENAKER.baseUrl}?page=3`,
  ];

  for (const pageUrl of pages) {
    try {
      const items = await scrapeKemenakerPage(pageUrl);
      allArticles.push(...items);
      log('kemenaker', `Found ${items.length} PHK-related articles on ${pageUrl}`);
      await delay(RATE_LIMIT.defaultDelayMs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('kemenaker', `Error scraping ${pageUrl}: ${msg}`);
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
