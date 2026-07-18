/**
 * scripts/scrapers/bps-html.ts — BPS HTML Scraper
 * Scrapes https://www.bps.go.id/id/pressrelease for press releases
 * categorized by indicator (IHK, Ekspor/Impor, Wisman, Transportasi, Ketenagakerjaan).
 */

import * as cheerio from 'cheerio';
import path from 'path';
import { withOpsLog } from '../ops/ops-logger';
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

async function scrapeBPSViaAPI(apiKey: string): Promise<{ total: number; byIndicator: Record<string, number> }> {
  log('bps-html', 'Starting BPS API scraper');
  const allArticles: BPSArticle[] = [];

  const currentYear = new Date().getFullYear();
  const backfillStartYear = Number.parseInt(process.env.BPS_BRS_BACKFILL_START_YEAR || '', 10);
  const startYear = Number.isFinite(backfillStartYear) && backfillStartYear >= 2000
    ? Math.min(backfillStartYear, currentYear)
    : Math.max(2024, currentYear - 1);
  const maxPagesPerYear = Math.max(
    1,
    Number.parseInt(process.env.BPS_BRS_MAX_PAGES_PER_YEAR || (backfillStartYear ? '30' : '8'), 10) || 8
  );
  const years: number[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    years.push(y);
  }

  log('bps-html', `Fetching press releases via API for years: ${years.join(', ')} (max ${maxPagesPerYear} pages/year)`);

  for (const year of years) {
    let page = 1;
    let totalPages = 1;
    let emptyRelevantPages = 0;

    while (page <= totalPages && page <= maxPagesPerYear) {
      const url = `https://webapi.bps.go.id/v1/api/list/model/pressrelease/domain/0000/page/${page}/year/${year}/key/${apiKey}`;
      log('bps-html', `Fetching page ${page} for year ${year}`);

      try {
        const res = await fetchWithRetry(url);
        const data = (await res.json()) as any;

        if (data.status !== 'OK') {
          log('bps-html', `API status not OK for year ${year} page ${page}: ${JSON.stringify(data)}`);
          break;
        }

        const pageInfo = data.data?.[0];
        const items = data.data?.[1];

        if (pageInfo && pageInfo.pages) {
          totalPages = pageInfo.pages;
        }

        if (Array.isArray(items) && items.length > 0) {
          let relevantOnPage = 0;

          for (const item of items) {
            // Clean up abstract (HTML description) to text
            const $ = cheerio.load(item.abstract || '');
            const summary = $('body').text().trim().slice(0, 500);

            // Matches indicator against title, summary, and subject
            const combinedText = `${item.title} ${summary} ${item.subj || ''}`;

            for (const indicator of BPS.indicators) {
              if (matchesKeywords(combinedText, indicator.keywords)) {
                relevantOnPage++;
                allArticles.push({
                  title: item.title,
                  date: item.rl_date || '',
                  summary,
                  link: item.pdf || '',
                  indicator: indicator.slug,
                  _source_url: item.pdf || url,
                  _scraped_at: timestamp(),
                });
              }
            }
          }

          emptyRelevantPages = relevantOnPage === 0 ? emptyRelevantPages + 1 : 0;
          if (!backfillStartYear && emptyRelevantPages >= 2) {
            log('bps-html', `Stopping ${year} after ${emptyRelevantPages} consecutive pages without relevant BRS records`);
            break;
          }
        } else {
          log('bps-html', `No items returned on page ${page} for year ${year}`);
          break;
        }

        page++;
        await delay(RATE_LIMIT.defaultDelayMs);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log('bps-html', `Error fetching page ${page} for year ${year}: ${msg}`);
        break;
      }
    }

    if (page > maxPagesPerYear && totalPages > maxPagesPerYear) {
      log('bps-html', `Stopped ${year} at configured page cap ${maxPagesPerYear}/${totalPages}`);
    }
  }

  // De-duplicate by link
  const seen = new Set<string>();
  const unique = allArticles.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  log('bps-html', `Total unique articles from API: ${unique.length}`);

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

export async function scrapeBPS(): Promise<{ total: number; byIndicator: Record<string, number> }> {
  const apiKey = process.env.BPS_API_KEY;
  if (apiKey) {
    log('bps-html', 'BPS_API_KEY environment variable detected. Scraping via BPS Web API...');
    try {
      return await scrapeBPSViaAPI(apiKey);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('bps-html', `API scraping failed: ${msg}. Falling back to default HTML scraping.`);
    }
  } else {
    log('bps-html', 'BPS_API_KEY environment variable not found. Scraping via default HTML parsing.');
  }

  log('bps-html', 'Starting BPS HTML scraper');
  const allArticles: BPSArticle[] = [];

  // Scrape multiple pages (up to 30 to cover data back to 2024)
  const pagesToScrape = Array.from({ length: 30 }, (_, i) => 
    i === 0 ? BPS.baseUrl : `${BPS.baseUrl}?page=${i + 1}`
  );

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
  // The daily BRS workflow executes this file directly (run-all wraps it only
  // for the weekly tier), so without withOpsLog here the /operasional page
  // only ever saw the Sunday run and reported the scraper stale all week.
  withOpsLog('bps-html', scrapeBPS)
    .then(({ logEntry }) => {
      log('bps-html', `Done. status=${logEntry.status} (fetched=${logEntry.items_fetched})`);
      process.exit(logEntry.status === 'error' ? 1 : 0);
    })
    .catch((err) => {
      log('bps-html', `Fatal error: ${err}`);
      process.exit(1);
    });
}
