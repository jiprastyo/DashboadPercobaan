/**
 * scripts/scrapers/google-news.ts — Google News RSS source
 *
 * For national outlets whose own feeds are unreachable from the GitHub Actions
 * runner (IP-blocked: CNN, Kontan, Bisnis) or frozen at the source (CNBC's
 * /news/rss has been stuck at 2026-05-29), we do NOT try to defeat their block.
 * Instead we read Google News — which is permitted to crawl them — via a
 * `site:` search, then resolve each Google redirect back to the real publisher
 * URL so the archive stores canonical links and true publication dates.
 *
 * The redirect resolver hits an undocumented Google endpoint (batchexecute).
 * It is fail-closed: if Google changes the mechanism, articles simply stop
 * flowing (visible on /operasional) rather than landing with google.com URLs —
 * the merge gate rejects news.google.com links anyway. This is the same
 * decoder already proven in scripts/recover-news-range.ts, kept self-contained
 * here so the daily aggregator has no dependency on the recovery tool.
 */

import RSSParser from 'rss-parser';
import {
  LABOR_KEYWORDS,
  fetchWithRetry,
  log,
  matchesKeywords,
  tagKBLI,
  timestamp,
  delay,
  RATE_LIMIT,
} from '../config';
import { isPlausibleNewsPublicationDate, isRealPublisherUrl } from '../../src/lib/news-quality';

export interface GoogleNewsArticle {
  title: string;
  link: string;
  date: string;
  published_at?: string;
  summary: string;
  outlet: string;
  categories: string[];
  kbli_sectors: Array<{ code: string; name: string }>;
  _source_url: string;
  _scraped_at: string;
  is_estimated?: boolean;
  date_source?: 'original_feed' | 'article_metadata';
  resolved_url?: string;
}

// How many Google redirects to resolve at once, and how many items per query.
const DECODE_CONCURRENCY = 4;
const MAX_ITEMS_PER_QUERY = 30;

function stripHtml(value?: string) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIso(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function googleArticleId(value: string) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    return url.hostname === 'news.google.com' && parts.at(-2) === 'articles'
      ? parts.at(-1) || ''
      : '';
  } catch {
    return '';
  }
}

/**
 * Resolve a news.google.com/rss/articles/... link to the real publisher URL.
 * Returns the original value on any failure so the caller's publisher-URL
 * check (isRealPublisherUrl) drops it rather than storing a Google link.
 */
async function decodeGoogleNewsUrl(value: string): Promise<string> {
  const articleId = googleArticleId(value);
  if (!articleId) return value;

  const articleResponse = await fetchWithRetry(`https://news.google.com/articles/${articleId}`, {}, 1);
  const body = await articleResponse.text();
  const signature = body.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const articleTimestamp = body.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!signature || !articleTimestamp) return value;

  const payload = JSON.stringify([
    [
      [
        'Fbv4je',
        JSON.stringify([
          'garturlreq',
          [
            ['X', 'X', ['X', 'X'], null, null, 1, 1, 'ID:id', null, 1, null, null, null, null, null, 0, 1],
            'X',
            'X',
            1,
            [1, 1, 1],
            1,
            1,
            null,
            0,
            0,
            null,
            0,
          ],
          articleId,
          Number(articleTimestamp),
          signature,
        ]),
      ],
    ],
  ]);

  const response = await fetchWithRetry(
    'https://news.google.com/_/DotsSplashUi/data/batchexecute',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `f.req=${encodeURIComponent(payload)}`,
    },
    1,
  );
  const text = (await response.text()).replace(/^\)\]\}'\s*/u, '').trim();
  const entries = JSON.parse(text) as unknown[];

  for (const entry of entries) {
    const innerJson = Array.isArray(entry) ? entry[2] : null;
    if (typeof innerJson !== 'string') continue;
    const inner = JSON.parse(innerJson);
    const resolved =
      Array.isArray(inner) && inner[0] === 'garturlres'
        ? inner[1] || inner[3]
        : Array.isArray(inner)
          ? inner[1]
          : '';
    if (typeof resolved === 'string' && isRealPublisherUrl(resolved)) {
      return resolved;
    }
  }

  return value;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function buildArticle(
  outlet: string,
  item: RSSParser.Item & { description?: string },
  publisherUrl: string,
): GoogleNewsArticle | null {
  const publishedAt = toIso(item.isoDate || item.pubDate);
  const title = stripHtml(item.title);
  const summary = stripHtml(item.description || item.contentSnippet);
  const text = `${title} ${summary}`;

  if (
    !title ||
    !publishedAt ||
    !matchesKeywords(text, LABOR_KEYWORDS) ||
    !isRealPublisherUrl(publisherUrl) ||
    !isPlausibleNewsPublicationDate(publishedAt, publisherUrl)
  ) {
    return null;
  }

  return {
    title,
    link: publisherUrl,
    date: publishedAt,
    published_at: publishedAt,
    summary: summary.slice(0, 500),
    outlet,
    categories: item.categories || [],
    kbli_sectors: tagKBLI(text),
    _source_url: item.link || publisherUrl,
    _scraped_at: timestamp(),
    is_estimated: false,
    date_source: 'original_feed',
    resolved_url: publisherUrl,
  };
}

/**
 * Fetch labor-related articles for one outlet via its Google News search
 * queries. `queries` are raw `q=` expressions, e.g.
 *   'site:cnnindonesia.com when:14d (PHK OR "tenaga kerja" OR pekerja)'
 * onFailure records a per-query error string for ops reporting.
 */
export async function scrapeGoogleNewsOutlet(
  outletName: string,
  queries: string[],
  onFailure: (message: string) => void,
): Promise<GoogleNewsArticle[]> {
  const parser = new RSSParser();
  const collected: GoogleNewsArticle[] = [];

  for (const query of queries) {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`;
    try {
      log('news-aggregator', `GoogleNews: ${outletName} — ${query}`);
      const response = await fetchWithRetry(rssUrl, {}, 2);
      const feed = await parser.parseString(await response.text());

      const candidates = (feed.items || [])
        .map((raw) => raw as RSSParser.Item & { description?: string })
        .filter((item) => {
          const publishedAt = toIso(item.isoDate || item.pubDate);
          const text = `${stripHtml(item.title)} ${stripHtml(item.description || item.contentSnippet)}`;
          return Boolean(item.link && publishedAt && matchesKeywords(text, LABOR_KEYWORDS));
        })
        .slice(0, MAX_ITEMS_PER_QUERY);

      const decoded = await mapWithConcurrency(candidates, DECODE_CONCURRENCY, async (item) => {
        try {
          const publisherUrl = await decodeGoogleNewsUrl(item.link!);
          return buildArticle(outletName, item, publisherUrl);
        } catch (error) {
          onFailure(`${outletName} (decode): ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      });

      for (const article of decoded) {
        if (article) collected.push(article);
      }
      log('news-aggregator', `  ${outletName}: ${collected.length} labor-related so far`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log('news-aggregator', `  Error fetching GoogleNews ${outletName}: ${message}`);
      onFailure(`${outletName}: ${message}`);
    }

    await delay(RATE_LIMIT.defaultDelayMs);
  }

  return collected;
}
