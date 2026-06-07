/**
 * scripts/scrapers/news-aggregator.ts — 8 News Outlet Aggregator
 * Aggregates news from RSS and HTML sources, filters by labor keywords,
 * and auto-tags with KBLI sector codes.
 */

import RSSParser from 'rss-parser';
import * as cheerio from 'cheerio';
import path from 'path';
import {
  NEWS_OUTLETS,
  LABOR_KEYWORDS,
  NEWS,
  fetchWithRetry,
  log,
  matchesKeywords,
  todayStr,
  timestamp,
  writeJSON,
  readJSON,
  ensureDir,
  delay,
  tagKBLI,
  RATE_LIMIT,
} from '../config';

interface NewsArticle {
  title: string;
  link: string;
  date: string;
  summary: string;
  outlet: string;
  categories: string[];
  kbli_sectors: Array<{ code: string; name: string }>;
  _source_url: string;
  _scraped_at: string;
}

// ─── RSS Scraper ─────────────────────────────────────────────────────────────
async function scrapeRSSOutlet(outletName: string, urls: string[]): Promise<NewsArticle[]> {
  const parser = new RSSParser();
  const articles: NewsArticle[] = [];

  for (const url of urls) {
    try {
      log('news-aggregator', `RSS: ${outletName} — ${url}`);

      let feed;
      try {
        feed = await parser.parseURL(url);
      } catch {
        // Retry with manual fetch
        const res = await fetchWithRetry(url);
        const xml = await res.text();
        feed = await parser.parseString(xml);
      }

      for (const item of feed.items || []) {
        const combinedText = `${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''} ${(item.categories || []).join(' ')}`;

        if (matchesKeywords(combinedText, LABOR_KEYWORDS)) {
          const fullText = `${item.title || ''} ${item.contentSnippet || ''}`;
          articles.push({
            title: item.title || '',
            link: item.link || '',
            date: item.isoDate || item.pubDate || '',
            summary: (item.contentSnippet || '').slice(0, 500),
            outlet: outletName,
            categories: item.categories || [],
            kbli_sectors: tagKBLI(fullText),
            _source_url: item.link || url,
            _scraped_at: timestamp(),
          });
        }
      }

      log('news-aggregator', `  ${outletName}: ${articles.length} labor-related from ${url}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('news-aggregator', `  Error fetching RSS ${outletName} (${url}): ${msg}`);
    }

    await delay(RATE_LIMIT.defaultDelayMs);
  }

  return articles;
}

// ─── HTML Scraper ────────────────────────────────────────────────────────────
async function scrapeHTMLOutlet(
  outletName: string,
  urls: string[],
  selectors: NonNullable<(typeof NEWS_OUTLETS)[0]['selectors']>,
): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];

  for (const url of urls) {
    try {
      log('news-aggregator', `HTML: ${outletName} — ${url}`);
      const res = await fetchWithRetry(url);
      const html = await res.text();
      const $ = cheerio.load(html);

      // Try the configured selectors
      const $items = $(selectors.articleList);

      if ($items.length === 0) {
        // Broad fallback: try generic article patterns
        log('news-aggregator', `  No items matched for ${outletName}, trying broad selectors`);
        $('a').each((_, el) => {
          const $el = $(el);
          const text = $el.text().trim();
          const href = $el.attr('href') || '';

          if (text.length > 20 && href && matchesKeywords(text, LABOR_KEYWORDS)) {
            const fullLink = href.startsWith('http')
              ? href
              : new URL(href, url).toString();

            articles.push({
              title: text,
              link: fullLink,
              date: '',
              summary: '',
              outlet: outletName,
              categories: [],
              kbli_sectors: tagKBLI(text),
              _source_url: fullLink,
              _scraped_at: timestamp(),
            });
          }
        });
      } else {
        $items.each((_, el) => {
          const $el = $(el);

          // Title
          const titleEl = $el.find(selectors.title).first();
          const title = titleEl.text().trim();
          if (!title || title.length < 10) return;

          // Link
          let link = '';
          const linkEl = $el.find(selectors.link).first();
          link = linkEl.attr('href') || $el.find('a').first().attr('href') || '';
          if (link && !link.startsWith('http')) {
            try {
              link = new URL(link, url).toString();
            } catch {
              link = `${url.replace(/\/$/, '')}/${link.replace(/^\//, '')}`;
            }
          }

          // Date
          let date = '';
          const dateEl = selectors.date ? $el.find(selectors.date).first() : null;
          if (dateEl && dateEl.length) {
            date = dateEl.attr('datetime') || dateEl.text().trim();
          }

          // Fallback to robust metadata extraction if CSS selector date is missing
          if (!date || date.trim() === '') {
            const metaDate = [
              $('meta[property="article:published_time"]').attr('content'),
              $('meta[name="pubdate"]').attr('content'),
              $('meta[name="publishdate"]').attr('content'),
              $('meta[name="date"]').attr('content'),
              $('time[datetime]').attr('datetime')
            ].find(d => !!d);

            if (metaDate) {
              date = metaDate;
            } else {
              // Check JSON-LD
              const scripts = $('script[type="application/ld+json"]');
              for (let i = 0; i < scripts.length; i++) {
                try {
                  const content = $(scripts[i]).html();
                  if (content) {
                    const data = JSON.parse(content);
                    const items = Array.isArray(data) ? data : [data];
                    for (const item of items) {
                      if (item.datePublished) {
                        date = item.datePublished;
                        break;
                      }
                    }
                  }
                } catch (e) {}
                if (date) break;
              }
            }
          }

          // Summary
          const summaryEl = selectors.summary
            ? $el.find(selectors.summary).first()
            : null;
          const summary = summaryEl && summaryEl.length ? summaryEl.text().trim().slice(0, 500) : '';

          const combinedText = `${title} ${summary}`;

          if (matchesKeywords(combinedText, LABOR_KEYWORDS)) {
            articles.push({
              title,
              link,
              date,
              summary,
              outlet: outletName,
              categories: [],
              kbli_sectors: tagKBLI(combinedText),
              _source_url: link || url,
              _scraped_at: timestamp(),
            });
          }
        });
      }

      log('news-aggregator', `  ${outletName}: ${articles.length} labor-related from ${url}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('news-aggregator', `  Error scraping HTML ${outletName} (${url}): ${msg}`);
    }

    await delay(RATE_LIMIT.defaultDelayMs);
  }

  return articles;
}

// ─── Main ────────────────────────────────────────────────────────────────────
export async function scrapeNews(): Promise<{ total: number; newItems: number; byOutlet: Record<string, number> }> {
  log('news-aggregator', 'Starting news aggregator');
  const allArticles: NewsArticle[] = [];
  const byOutlet: Record<string, number> = {};

  for (const outlet of NEWS_OUTLETS) {
    try {
      let outletArticles: NewsArticle[];

      if (outlet.type === 'rss') {
        outletArticles = await scrapeRSSOutlet(outlet.name, outlet.urls);
      } else {
        outletArticles = await scrapeHTMLOutlet(
          outlet.name,
          outlet.urls,
          outlet.selectors!,
        );
      }

      allArticles.push(...outletArticles);
      byOutlet[outlet.name] = outletArticles.length;
      log('news-aggregator', `${outlet.name}: ${outletArticles.length} articles`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('news-aggregator', `Error with ${outlet.name}: ${msg}`);
      byOutlet[outlet.name] = 0;
    }
  }

  // Deduplicate by link
  const seen = new Set<string>();
  const unique = allArticles.filter((a) => {
    const key = a.link || a.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  log('news-aggregator', `Total unique articles: ${unique.length} (from ${allArticles.length})`);

  // Save to daily file
  const today = todayStr();
  ensureDir(NEWS.dataDir);
  const outPath = path.join(NEWS.dataDir, `${today}.json`);

  // Merge with existing
  const existing = readJSON<NewsArticle[]>(outPath) || [];
  const existingLinks = new Set(existing.map((e) => e.link || e.title));
  const newItems = unique.filter((i) => !existingLinks.has(i.link || i.title));
  const merged = [...existing, ...newItems];

  writeJSON(outPath, merged);
  log('news-aggregator', `${newItems.length} new, ${merged.length} total for ${today}`);

  return { total: merged.length, newItems: newItems.length, byOutlet };
}

// Run directly
if (require.main === module) {
  scrapeNews()
    .then((result) => {
      log('news-aggregator', `Done. ${JSON.stringify(result)}`);
    })
    .catch((err) => {
      log('news-aggregator', `Fatal error: ${err}`);
      process.exit(1);
    });
}
