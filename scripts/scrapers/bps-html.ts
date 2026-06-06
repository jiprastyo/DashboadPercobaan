/**
 * scripts/scrapers/bps-html.ts — BPS HTML Scraper
 * Scrapes https://www.bps.go.id/id/pressrelease for press releases
 * categorized by indicator (IHK, Ekspor/Impor, Wisman, Transportasi, Ketenagakerjaan).
 */

import * as cheerio from 'cheerio';
import path from 'path';
import {
  BPS,
  fetchWithRetry,
  log,
  matchesKeywords,
  monthStr,
  timestamp,
  writeJSON,
  readJSON,
  delay,
  RATE_LIMIT,
  ensureDir,
} from '../config';

interface BPSArticle {
  title: string;
  date: string;
  summary: string;
  link: string;
  indicator: string;
  _source_url: string;
  _scraped_at: string;
}

async function scrapeBPSPage(pageUrl: string): Promise<BPSArticle[]> {
  log('bps-html', `Fetching ${pageUrl}`);
  const res = await fetchWithRetry(pageUrl);
  const html = await res.text();
  const $ = cheerio.load(html);
  const articles: BPSArticle[] = [];

  // BPS press release page uses various card/list structures
  // Try multiple selectors for robustness
  const selectors = [
    '.press-release-item',
    '.card',
    '.list-group-item',
    'article',
    '.col-12 .row',
    'tr',
  ];

  let $items = $([]);
  for (const sel of selectors) {
    const found = $(sel);
    if (found.length > 0) {
      $items = found;
      log('bps-html', `Matched selector: "${sel}" (${found.length} items)`);
      break;
    }
  }

  // Fallback: parse all links with titles that look like press releases
  if ($items.length === 0) {
    log('bps-html', 'No structured items found, falling back to anchor scan');
    $('a').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const text = $el.text().trim();
      if (
        href.includes('pressrelease') &&
        text.length > 20 &&
        !href.endsWith('/pressrelease')
      ) {
        const fullLink = href.startsWith('http')
          ? href
          : `https://www.bps.go.id${href}`;

        // Categorize by indicator keywords
        for (const indicator of BPS.indicators) {
          if (matchesKeywords(text, indicator.keywords)) {
            articles.push({
              title: text,
              date: '',
              summary: '',
              link: fullLink,
              indicator: indicator.slug,
              _source_url: fullLink,
              _scraped_at: timestamp(),
            });
          }
        }
      }
    });
    return articles;
  }

  $items.each((_, el) => {
    const $el = $(el);
    const titleEl = $el.find('a, h3, h4, h5, .title').first();
    const title = titleEl.text().trim();
    if (!title || title.length < 10) return;

    let link = titleEl.attr('href') || $el.find('a').first().attr('href') || '';
    if (link && !link.startsWith('http')) {
      link = `https://www.bps.go.id${link}`;
    }

    const dateEl = $el.find('time, .date, .text-muted, small').first();
    const date = dateEl.text().trim() || dateEl.attr('datetime') || '';

    const summaryEl = $el.find('p, .description, .summary').first();
    const summary = summaryEl.text().trim().slice(0, 500);

    const combinedText = `${title} ${summary}`;

    for (const indicator of BPS.indicators) {
      if (matchesKeywords(combinedText, indicator.keywords)) {
        articles.push({
          title,
          date,
          summary,
          link,
          indicator: indicator.slug,
          _source_url: link || pageUrl,
          _scraped_at: timestamp(),
        });
      }
    }
  });

  return articles;
}

export async function scrapeBPS(): Promise<{ total: number; byIndicator: Record<string, number> }> {
  log('bps-html', 'Starting BPS scraper');
  const allArticles: BPSArticle[] = [];

  // Scrape multiple pages
  const pagesToScrape = [
    BPS.baseUrl,
    `${BPS.baseUrl}?page=2`,
    `${BPS.baseUrl}?page=3`,
  ];

  for (const pageUrl of pagesToScrape) {
    try {
      const pageArticles = await scrapeBPSPage(pageUrl);
      allArticles.push(...pageArticles);
      log('bps-html', `Found ${pageArticles.length} articles on ${pageUrl}`);
      await delay(RATE_LIMIT.defaultDelayMs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('bps-html', `Error scraping ${pageUrl}: ${msg}`);
    }
  }

  // De-duplicate by link
  const seen = new Set<string>();
  const unique = allArticles.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  log('bps-html', `Total unique articles: ${unique.length}`);

  // Group by indicator and save
  const byIndicator: Record<string, BPSArticle[]> = {};
  for (const article of unique) {
    if (!byIndicator[article.indicator]) {
      byIndicator[article.indicator] = [];
    }
    byIndicator[article.indicator].push(article);
  }

  const month = monthStr();
  const countByIndicator: Record<string, number> = {};

  for (const [indicator, items] of Object.entries(byIndicator)) {
    const outDir = path.join(BPS.dataDir, indicator);
    ensureDir(outDir);
    const outPath = path.join(outDir, `${month}.json`);

    // Merge with existing data
    const existing = readJSON<BPSArticle[]>(outPath) || [];
    const existingLinks = new Set(existing.map((e) => e.link));
    const newItems = items.filter((i) => !existingLinks.has(i.link));
    const merged = [...existing, ...newItems];

    writeJSON(outPath, merged);
    countByIndicator[indicator] = newItems.length;
    log('bps-html', `${indicator}: ${newItems.length} new, ${merged.length} total`);
  }

  return { total: unique.length, byIndicator: countByIndicator };
}

// Run directly
if (require.main === module) {
  scrapeBPS()
    .then((result) => {
      log('bps-html', `Done. ${JSON.stringify(result)}`);
    })
    .catch((err) => {
      log('bps-html', `Fatal error: ${err}`);
      process.exit(1);
    });
}
