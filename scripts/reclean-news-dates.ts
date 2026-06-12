import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';

const HISTORICAL_FILE = path.join(process.cwd(), 'data', 'news', 'historical-seed.json');
const CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY || '8');
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || '12000');
const RSS_TIMEOUT_MS = Number(process.env.RSS_TIMEOUT_MS || '8000');
const CHECKPOINT_EVERY = Number(process.env.CHECKPOINT_EVERY || '100');
const SAMPLE_LIMIT = Number(process.env.SAMPLE_LIMIT || '0');
const SAMPLE_OFFSET = Number(process.env.SAMPLE_OFFSET || '0');
const RETRY_CHECKED_FALLBACKS = process.env.RETRY_CHECKED_FALLBACKS === '1';
const parser = new Parser({
  customFields: {
    item: ['pubDate', 'description'],
  },
});

type HistoricalArticle = {
  id: string;
  title: string;
  date: string;
  source: string;
  source_name: string;
  excerpt: string;
  sector_tags?: string[];
  keywords_matched?: string[];
  _source_url: string;
  _scraped_at: string;
  is_estimated?: boolean;
  resolved_url?: string;
  published_at?: string;
  date_source?: 'original_feed' | 'article_metadata' | 'fallback_estimate';
  date_checked_at?: string;
};

type ResolutionResult = {
  article: HistoricalArticle;
  changed: boolean;
  verified: boolean;
  finalUrl?: string;
  publishedAt?: string;
};

type GoogleRssMatch = {
  publishedAt: string;
  googleUrl: string;
};

function normalizeComparableTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+-\s+[^-]+$/u, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildGoogleNewsQueries(article: HistoricalArticle): string[] {
  const titleWithoutSource = article.title
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+-\s+[^-]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();

  const sourceName = article.source_name || article.source;
  const candidates = [
    `${titleWithoutSource} ${sourceName}`,
    `"${titleWithoutSource}"`,
    titleWithoutSource,
    `intitle:"${titleWithoutSource}"`,
    `intitle:"${article.title}"`,
  ];

  return Array.from(new Set(candidates.map((query) => query.trim()).filter(Boolean)));
}

function titleSimilarity(left: string, right: string): number {
  const leftTokens = new Set(normalizeComparableTitle(left).split(' ').filter((token) => token.length > 2));
  const rightTokens = new Set(normalizeComparableTitle(right).split(' ').filter((token) => token.length > 2));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let matches = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  }

  return matches / Math.max(leftTokens.size, rightTokens.size);
}

async function lookupPubDateFromGoogleRss(article: HistoricalArticle): Promise<GoogleRssMatch | null> {
  const targetTitle = normalizeComparableTitle(article.title);
  const targetGoogleId = decodeBase64UrlToken(article._source_url);

  for (const query of buildGoogleNewsQueries(article)) {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`;
      const feed = await Promise.race([
        parser.parseURL(rssUrl),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Google RSS timeout')), RSS_TIMEOUT_MS);
        }),
      ]);

      for (const item of feed.items ?? []) {
        const itemLink = item.link || '';
        const itemTitle = typeof item.title === 'string' ? item.title : '';
        const itemGoogleId = itemLink ? decodeBase64UrlToken(itemLink) : null;
        const comparableItemTitle = normalizeComparableTitle(itemTitle);
        const titleMatches =
          comparableItemTitle === targetTitle ||
          comparableItemTitle.includes(targetTitle) ||
          targetTitle.includes(comparableItemTitle) ||
          titleSimilarity(itemTitle, article.title) >= 0.72;
        const linkMatches =
          itemLink === article._source_url ||
          (targetGoogleId !== null && itemGoogleId !== null && itemGoogleId === targetGoogleId);

        if (!linkMatches && !titleMatches) {
          continue;
        }

        const normalized = item.pubDate ? normalizeDateString(item.pubDate) : null;
        if (normalized) {
          return {
            publishedAt: normalized,
            googleUrl: itemLink || article._source_url,
          };
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

function isGoogleNewsArticleUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.hostname === 'news.google.com' && url.pathname.includes('/articles/');
  } catch {
    return false;
  }
}

function decodeBase64UrlToken(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    const parts = url.pathname.split('/');
    if (url.hostname !== 'news.google.com' || parts[parts.length - 2] !== 'articles') {
      return null;
    }

    return parts[parts.length - 1];
  } catch {
    return null;
  }
}

function withCookies(headers: Record<string, string>, cookies: string[]): Record<string, string> {
  if (cookies.length === 0) {
    return headers;
  }

  return {
    ...headers,
    cookie: cookies.join('; '),
  };
}

function collectCookies(response: Response, existing: string[]): string[] {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    return existing;
  }

  const next = setCookie
    .split(/,(?=[^;]+=[^;]+)/)
    .map((entry) => entry.split(';', 1)[0]?.trim())
    .filter(Boolean) as string[];

  const cookieMap = new Map<string, string>();
  for (const cookie of [...existing, ...next]) {
    const [name, value = ''] = cookie.split('=', 2);
    cookieMap.set(name, `${name}=${value}`);
  }

  return Array.from(cookieMap.values());
}

async function fetchDecodingParams(articleId: string): Promise<{ signature: string; timestamp: string; cookies: string[] } | null> {
  const cookies = ['CONSENT=PENDING+987'];
  try {
    const response = await fetch(`https://news.google.com/articles/${articleId}`, {
      headers: withCookies(
        {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1',
          'upgrade-insecure-requests': '1',
        },
        cookies
      ),
      redirect: 'follow',
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.text();
    const signatureMatch = body.match(/data-n-a-sg="([^"]+)"/);
    const timestampMatch = body.match(/data-n-a-ts="([^"]+)"/);
    if (!signatureMatch || !timestampMatch) {
      return null;
    }

    return {
      signature: signatureMatch[1],
      timestamp: timestampMatch[1],
      cookies: collectCookies(response, cookies),
    };
  } catch {
    return null;
  }
}

async function decodeGoogleNewsUrl(sourceUrl: string): Promise<string> {
  const articleId = decodeBase64UrlToken(sourceUrl);
  if (!articleId) {
    return sourceUrl;
  }

  const params = await fetchDecodingParams(articleId);
  if (!params) {
    return sourceUrl;
  }

  const payload = JSON.stringify([
    [
      [
        'Fbv4je',
        JSON.stringify([
          'garturlreq',
          [
            ['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
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
          Number(params.timestamp),
          params.signature,
        ]),
      ],
    ],
  ]);

  try {
    const response = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      headers: withCookies(
        {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://news.google.com',
          'Referer': 'https://news.google.com/',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'x-same-domain': '1',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
        },
        params.cookies
      ),
      body: `f.req=${encodeURIComponent(payload)}`,
    });

    if (!response.ok) {
      return sourceUrl;
    }

    const text = await response.text();
    const parts = text.split('\n\n');
    if (parts.length < 2) {
      return sourceUrl;
    }

    const parsed = JSON.parse(parts[1].trim());
    const innerJson = parsed?.[0]?.[2];
    if (typeof innerJson !== 'string') {
      return sourceUrl;
    }

    const inner = JSON.parse(innerJson);
    return typeof inner?.[1] === 'string' ? inner[1] : sourceUrl;
  } catch {
    return sourceUrl;
  }
}

async function fetchHtml(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<{ html: string | null; finalUrl?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { html: null };
    }

    return {
      html: await response.text(),
      finalUrl: response.url,
    };
  } catch {
    return { html: null };
  }
}

function normalizeDateString(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function extractFromJsonLd(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    const queue = Array.isArray(parsed) ? [...parsed] : [parsed];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') {
        continue;
      }

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      const record = current as Record<string, unknown>;

      if (typeof record.datePublished === 'string') {
        return record.datePublished;
      }

      if (Array.isArray(record['@graph'])) {
        queue.push(...(record['@graph'] as unknown[]));
      }
    }
  } catch {
    return null;
  }

  return null;
}

function parsePublishedDate(html: string): string | null {
  const $ = cheerio.load(html);

  const metaSelectors = [
    'meta[property="article:published_time"]',
    'meta[property="og:published_time"]',
    'meta[name="publishdate"]',
    'meta[name="pubdate"]',
    'meta[name="date"]',
    'meta[itemprop="datePublished"]',
    'time[datetime]',
  ];

  for (const selector of metaSelectors) {
    const element = $(selector).first();
    if (!element.length) {
      continue;
    }

    const content = element.attr('content') || element.attr('datetime') || element.text().trim();
    if (!content) {
      continue;
    }

    const normalized = normalizeDateString(content);
    if (normalized) {
      return normalized;
    }
  }

  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i += 1) {
    const content = $(scripts[i]).html();
    if (!content) {
      continue;
    }

    const extracted = extractFromJsonLd(content);
    if (!extracted) {
      continue;
    }

    const normalized = normalizeDateString(extracted);
    if (normalized) {
      return normalized;
    }
  }

  const itemPropTime = $('[itemprop="datePublished"]').first();
  if (itemPropTime.length) {
    const nestedTime = itemPropTime.find('time').first();
    const candidate =
      nestedTime.attr('datetime') ||
      nestedTime.attr('content') ||
      nestedTime.text().trim() ||
      itemPropTime.attr('content') ||
      itemPropTime.text().trim();

    if (candidate) {
      const normalized = normalizeDateString(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

async function resolveArticle(article: HistoricalArticle): Promise<ResolutionResult> {
  const result: ResolutionResult = {
    article: { ...article },
    changed: false,
    verified: false,
  };

  if (!article._source_url) {
    result.article.date_checked_at = new Date().toISOString();
    result.article.date_source = article.date_source || 'fallback_estimate';
    return result;
  }

  const feedMatch = await lookupPubDateFromGoogleRss(article);
  if (feedMatch) {
    const resolvedUrl = isGoogleNewsArticleUrl(feedMatch.googleUrl)
      ? await decodeGoogleNewsUrl(feedMatch.googleUrl)
      : feedMatch.googleUrl;
    const originalUrl = isGoogleNewsArticleUrl(resolvedUrl) ? article.resolved_url : resolvedUrl;

    result.verified = true;
    result.publishedAt = feedMatch.publishedAt;
    result.finalUrl = originalUrl;
    result.article.published_at = feedMatch.publishedAt;
    result.article.date = feedMatch.publishedAt;
    result.article.is_estimated = false;
    result.article.date_source = 'original_feed';
    result.article.date_checked_at = new Date().toISOString();
    if (originalUrl) {
      result.article.resolved_url = originalUrl;
    }
    result.changed =
      article.date !== feedMatch.publishedAt ||
      article.is_estimated === true ||
      article.resolved_url !== result.article.resolved_url ||
      article.date_source !== 'original_feed';
    return result;
  }

  const candidateUrl = article._source_url.includes('news.google.com/rss/articles')
    ? await decodeGoogleNewsUrl(article._source_url)
    : article._source_url;

  const { html, finalUrl } = await fetchHtml(candidateUrl);
  result.finalUrl = finalUrl;

  if (!html) {
    result.article.date_checked_at = new Date().toISOString();
    result.article.date_source = article.date_source || 'fallback_estimate';
    return result;
  }

  const publishedAt = parsePublishedDate(html);
  result.article.date_checked_at = new Date().toISOString();

  if (!publishedAt) {
    result.article.date_source = article.date_source || 'fallback_estimate';
    if (finalUrl) {
      result.article.resolved_url = finalUrl || candidateUrl;
    }
    return result;
  }

  result.verified = true;
  result.publishedAt = publishedAt;
  result.article.published_at = publishedAt;
  result.article.date = publishedAt;
  result.article.is_estimated = false;
  result.article.date_source = 'article_metadata';
  result.article.resolved_url = finalUrl || candidateUrl;
  result.changed =
    article.date !== publishedAt ||
    article.is_estimated === true ||
    article.resolved_url !== result.article.resolved_url ||
    article.date_source !== 'article_metadata';

  return result;
}

async function runPool(articles: HistoricalArticle[], allArticles: HistoricalArticle[]) {
  const resolved: HistoricalArticle[] = [];
  let processed = 0;
  let verified = 0;
  let changed = 0;

  for (let index = 0; index < articles.length; index += CONCURRENCY) {
    const batch = articles.slice(index, index + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(resolveArticle));

    for (const entry of batchResults) {
      processed += 1;
      if (entry.verified) {
        verified += 1;
      }
      if (entry.changed) {
        changed += 1;
      }
      resolved.push(entry.article);
    }

    console.log(`Processed ${processed}/${articles.length} | verified=${verified} | changed=${changed}`);

    if (processed % CHECKPOINT_EVERY === 0) {
      const resolvedById = new Map(resolved.map((article) => [article.id, article]));
      const checkpointMerged = allArticles.map((article) => resolvedById.get(article.id) ?? article);
      checkpointMerged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      fs.writeFileSync(HISTORICAL_FILE, JSON.stringify(checkpointMerged, null, 2));
      console.log(`Checkpoint saved at ${processed}`);
    }
  }

  return { resolved, processed, verified, changed };
}

async function main() {
  if (!fs.existsSync(HISTORICAL_FILE)) {
    console.error('Historical news file not found.');
    process.exit(1);
  }

  const raw = fs.readFileSync(HISTORICAL_FILE, 'utf-8');
  const articles = JSON.parse(raw) as HistoricalArticle[];
  const estimatedCount = articles.filter((article) => article.is_estimated).length;
  const checkedFallbackCount = articles.filter(
    (article) => article.is_estimated && article.date_source === 'fallback_estimate' && article.date_checked_at
  ).length;
  const targetArticles = articles.filter(
    (article) =>
      article.is_estimated &&
      article._source_url?.includes('news.google.com/rss/articles') &&
      (RETRY_CHECKED_FALLBACKS || article.date_source !== 'fallback_estimate' || !article.date_checked_at)
  );
  const workingSet =
    SAMPLE_LIMIT > 0
      ? targetArticles.slice(SAMPLE_OFFSET, SAMPLE_OFFSET + SAMPLE_LIMIT)
      : targetArticles;

  console.log(`Loaded ${articles.length} articles.`);
  console.log(`Estimated dates remaining before backfill: ${estimatedCount}`);
  console.log(`Checked fallback estimates skipped this run: ${RETRY_CHECKED_FALLBACKS ? 0 : checkedFallbackCount}`);
  console.log(`Google News estimated articles targeted this run: ${workingSet.length}`);
  if (SAMPLE_LIMIT > 0) {
    console.log(`Sample offset: ${SAMPLE_OFFSET}`);
  }

  const { resolved, processed, verified, changed } = await runPool(workingSet, articles);
  const resolvedById = new Map(resolved.map((article) => [article.id, article]));
  const merged = articles.map((article) => resolvedById.get(article.id) ?? article);
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  fs.writeFileSync(HISTORICAL_FILE, JSON.stringify(merged, null, 2));

  const estimatedAfter = merged.filter((article) => article.is_estimated).length;

  console.log('');
  console.log('Backfill completed.');
  console.log(`Processed: ${processed}`);
  console.log(`Verified publish dates: ${verified}`);
  console.log(`Articles changed: ${changed}`);
  console.log(`Estimated dates remaining after backfill: ${estimatedAfter}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
