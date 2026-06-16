import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';

const HISTORICAL_FILE = path.join(process.cwd(), 'data', 'news', 'historical-seed.json');
const CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY || '8');
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || '12000');
const RSS_TIMEOUT_MS = Number(process.env.RSS_TIMEOUT_MS || '8000');
const CHECKPOINT_EVERY = Number(process.env.CHECKPOINT_EVERY || '100');
const BATCH_DELAY_MS = Number(process.env.BATCH_DELAY_MS || '0');
const SAMPLE_LIMIT = Number(process.env.SAMPLE_LIMIT || '0');
const SAMPLE_OFFSET = Number(process.env.SAMPLE_OFFSET || '0');
const GOOGLE_DECODE_RETRIES = Number(process.env.GOOGLE_DECODE_RETRIES || '0');
const GOOGLE_DECODE_RETRY_DELAY_MS = Number(process.env.GOOGLE_DECODE_RETRY_DELAY_MS || '0');
const RETRY_CHECKED_FALLBACKS = process.env.RETRY_CHECKED_FALLBACKS === '1';
const SKIP_GOOGLE_RSS = process.env.SKIP_GOOGLE_RSS === '1';
const TARGET_CHECKED_FALLBACKS_ONLY = process.env.TARGET_CHECKED_FALLBACKS_ONLY === '1';
const PREFER_RESOLVED_URL = process.env.PREFER_RESOLVED_URL === '1';
const TARGET_NON_GOOGLE_DIRECT_ONLY = process.env.TARGET_NON_GOOGLE_DIRECT_ONLY === '1';
const TARGET_GOOGLE_SOURCE_ONLY = process.env.TARGET_GOOGLE_SOURCE_ONLY === '1';
const SKIP_GENERIC_GOOGLE_TITLES = process.env.SKIP_GENERIC_GOOGLE_TITLES === '1';
const parser = new Parser({
  customFields: {
    item: ['pubDate', 'description'],
  },
});

const MONTH_LOOKUP: Record<string, string> = {
  january: '01',
  jan: '01',
  januari: '01',
  februari: '02',
  february: '02',
  feb: '02',
  maret: '03',
  march: '03',
  mar: '03',
  april: '04',
  apr: '04',
  mei: '05',
  may: '05',
  juni: '06',
  june: '06',
  jun: '06',
  juli: '07',
  july: '07',
  jul: '07',
  agustus: '08',
  august: '08',
  agu: '08',
  agt: '08',
  aug: '08',
  september: '09',
  sept: '09',
  sep: '09',
  oktober: '10',
  october: '10',
  okt: '10',
  oct: '10',
  november: '11',
  nov: '11',
  desember: '12',
  december: '12',
  des: '12',
  dec: '12',
};

const TIMEZONE_LOOKUP: Record<string, string> = {
  WIB: '+07:00',
  WITA: '+08:00',
  WIT: '+09:00',
  UTC: 'Z',
  GMT: '+00:00',
};

const GENERIC_TITLE_PATTERNS = [
  /Media Nasional Berjejaring/iu,
  /Terbaru dan Terupdate/iu,
  /Paling Mengerti/iu,
  /\bHalaman \d+\b/iu,
  /^Kapitalisasi Pasar/iu,
  /^Data .+ Databoks/iu,
  /^Kr Jogja/iu,
  /^Sofi Wulandari\b/iu,
];

const DATE_PREFIX_PATTERN =
  /^(senin|selasa|rabu|kamis|jumat|jum'at|jum’at|sabtu|minggu|ahad|monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+/iu;
const DATE_LABEL_PATTERN =
  /^(dipublikasikan|diterbitkan|diperbarui|published|publish date|publish|posted|tanggal|date)\s*:?\s+/iu;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function normalizeDateWhitespace(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function padDatePart(value: string | undefined, size = 2): string {
  return (value || '').padStart(size, '0');
}

function isGenericGoogleTitle(title: string | undefined): boolean {
  const current = title || '';
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(current));
}

function timezoneToOffset(value?: string): string {
  if (!value) {
    return 'Z';
  }

  return TIMEZONE_LOOKUP[value.toUpperCase()] || 'Z';
}

function buildIsoDate(
  year: string,
  month: string,
  day: string,
  hour = '00',
  minute = '00',
  second = '00',
  timezone?: string
): string | null {
  const isoCandidate = `${year}-${padDatePart(month)}-${padDatePart(day)}T${padDatePart(hour)}:${padDatePart(minute)}:${padDatePart(second)}${timezoneToOffset(timezone)}`;
  const parsed = new Date(isoCandidate);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function parseStructuredDateCandidate(input: string): string | null {
  const candidate = normalizeDateWhitespace(input)
    .replace(DATE_PREFIX_PATTERN, '')
    .replace(DATE_LABEL_PATTERN, '')
    .replace(/\s+\|\s+/g, ' ')
    .replace(/\s+-\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  if (!candidate) {
    return null;
  }

  const yearMonthDay = candidate.match(
    /(?<!\d)(\d{4})[/. -](\d{1,2})[/. -](\d{1,2})(?:[T\s,|]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(WIB|WITA|WIT|UTC|GMT)?)?/iu
  );
  if (yearMonthDay) {
    return buildIsoDate(
      yearMonthDay[1],
      yearMonthDay[2],
      yearMonthDay[3],
      yearMonthDay[4],
      yearMonthDay[5],
      yearMonthDay[6],
      yearMonthDay[7]
    );
  }

  const dayMonthYear = candidate.match(
    /(?<!\d)(\d{1,2})\s+([A-Za-zÀ-ÿ.]+)\s+(\d{4})(?:[^\dA-Za-z]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(WIB|WITA|WIT|UTC|GMT)?)?/iu
  );
  if (dayMonthYear) {
    const month = MONTH_LOOKUP[dayMonthYear[2].toLowerCase().replace(/\./g, '')];
    if (month) {
      return buildIsoDate(
        dayMonthYear[3],
        month,
        dayMonthYear[1],
        dayMonthYear[4],
        dayMonthYear[5],
        dayMonthYear[6],
        dayMonthYear[7]
      );
    }
  }

  const monthDayYear = candidate.match(
    /([A-Za-zÀ-ÿ.]+)\s+(\d{1,2}),?\s+(\d{4})(?:[^\dA-Za-z]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(WIB|WITA|WIT|UTC|GMT)?)?/iu
  );
  if (monthDayYear) {
    const month = MONTH_LOOKUP[monthDayYear[1].toLowerCase().replace(/\./g, '')];
    if (month) {
      return buildIsoDate(
        monthDayYear[3],
        month,
        monthDayYear[2],
        monthDayYear[4],
        monthDayYear[5],
        monthDayYear[6],
        monthDayYear[7]
      );
    }
  }

  const daySlashMonthSlashYear = candidate.match(
    /(?<!\d)(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[^\dA-Za-z]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(WIB|WITA|WIT|UTC|GMT)?)?/iu
  );
  if (daySlashMonthSlashYear) {
    return buildIsoDate(
      daySlashMonthSlashYear[3],
      daySlashMonthSlashYear[2],
      daySlashMonthSlashYear[1],
      daySlashMonthSlashYear[4],
      daySlashMonthSlashYear[5],
      daySlashMonthSlashYear[6],
      daySlashMonthSlashYear[7]
    );
  }

  return null;
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

  for (let attempt = 0; attempt <= GOOGLE_DECODE_RETRIES; attempt += 1) {
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
      const cleaned = text.replace(/^\)\]\}'\s*/u, '').trim();
      if (!cleaned) {
        return sourceUrl;
      }

      const parsed = JSON.parse(cleaned);
      const entries = Array.isArray(parsed) ? parsed : [];

      for (const entry of entries) {
        const innerJson = Array.isArray(entry) ? entry[2] : null;
        if (typeof innerJson !== 'string') {
          continue;
        }

        const inner = JSON.parse(innerJson);
        const resolvedUrl =
          Array.isArray(inner) && inner[0] === 'garturlres'
            ? typeof inner[1] === 'string' && inner[1]
              ? inner[1]
              : typeof inner[3] === 'string' && inner[3]
                ? inner[3]
                : null
            : typeof inner?.[1] === 'string' && inner[1]
              ? inner[1]
              : null;

        if (resolvedUrl && !isGoogleNewsArticleUrl(resolvedUrl)) {
          return resolvedUrl;
        }
      }
    } catch {
      // Retry after a cooldown if configured.
    }

    if (attempt < GOOGLE_DECODE_RETRIES && GOOGLE_DECODE_RETRY_DELAY_MS > 0) {
      await sleep(GOOGLE_DECODE_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  return sourceUrl;
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
  const structured = parseStructuredDateCandidate(value);
  if (structured) {
    return structured;
  }

  const parsed = new Date(normalizeDateWhitespace(value));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function extractFromJsonLd(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
    const preferredKeys = ['datePublished', 'uploadDate', 'dateCreated'];

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

      for (const key of preferredKeys) {
        if (typeof record[key] === 'string') {
          return record[key] as string;
        }
      }

      for (const value of Object.values(record)) {
        if (value && typeof value === 'object') {
          queue.push(value);
        }
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
    'meta[property="og:article:published_time"]',
    'meta[property="og:published_time"]',
    'meta[property="article:published"]',
    'meta[name="article:published_time"]',
    'meta[name="article.published"]',
    'meta[name="publishdate"]',
    'meta[name="publish-date"]',
    'meta[name="pubdate"]',
    'meta[name="datePublished"]',
    'meta[name="parsely-pub-date"]',
    'meta[name="cXenseParse:publishtime"]',
    'meta[name="sailthru.date"]',
    'meta[name="dc.date"]',
    'meta[property="dc:date"]',
    'meta[property="bt:pubDate"]',
    'meta[name="date"]',
    'meta[itemprop="datePublished"]',
    '[itemprop="datePublished"]',
    'time[datetime]',
    'article time',
    'main time',
  ];

  for (const selector of metaSelectors) {
    const elements = $(selector).slice(0, 3).toArray();
    if (elements.length === 0) {
      continue;
    }

    for (const element of elements) {
      const current = $(element);
      const content = current.attr('content') || current.attr('datetime') || current.text().trim();
      if (!content) {
        continue;
      }

      const normalized = normalizeDateString(content);
      if (normalized) {
        return normalized;
      }
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

  if (!article._source_url && !article.resolved_url) {
    result.article.date_checked_at = new Date().toISOString();
    result.article.date_source = article.date_source || 'fallback_estimate';
    return result;
  }

  if (!SKIP_GOOGLE_RSS && article._source_url) {
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
  }

  const directResolvedUrl =
    article.resolved_url && !isGoogleNewsArticleUrl(article.resolved_url) ? article.resolved_url : undefined;
  let candidateUrl = directResolvedUrl || article._source_url || article.resolved_url || '';

  if (PREFER_RESOLVED_URL && directResolvedUrl) {
    candidateUrl = directResolvedUrl;
  } else if (article._source_url?.includes('news.google.com/rss/articles')) {
    const decodedUrl = await decodeGoogleNewsUrl(article._source_url);
    candidateUrl = isGoogleNewsArticleUrl(decodedUrl) ? directResolvedUrl || decodedUrl : decodedUrl;
  }

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

    if (BATCH_DELAY_MS > 0 && index + CONCURRENCY < articles.length) {
      await sleep(BATCH_DELAY_MS);
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
    (article) => {
      if (!article.is_estimated) {
        return false;
      }

      const isCheckedFallback = article.date_source === 'fallback_estimate' && Boolean(article.date_checked_at);
      if (TARGET_CHECKED_FALLBACKS_ONLY && !isCheckedFallback) {
        return false;
      }

      if (!TARGET_CHECKED_FALLBACKS_ONLY && !RETRY_CHECKED_FALLBACKS && isCheckedFallback) {
        return false;
      }

      const hasGoogleSource = article._source_url?.includes('news.google.com/rss/articles');
      const hasDirectSource = Boolean(article._source_url && !hasGoogleSource);
      const hasDirectResolved = Boolean(article.resolved_url && !isGoogleNewsArticleUrl(article.resolved_url));
      const isGenericGoogle = isGenericGoogleTitle(article.title);

      if (TARGET_GOOGLE_SOURCE_ONLY) {
        return Boolean(hasGoogleSource && !hasDirectResolved && (!SKIP_GENERIC_GOOGLE_TITLES || !isGenericGoogle));
      }

      if (TARGET_NON_GOOGLE_DIRECT_ONLY) {
        return Boolean(hasDirectSource || hasDirectResolved);
      }

      if (SKIP_GOOGLE_RSS || TARGET_CHECKED_FALLBACKS_ONLY || PREFER_RESOLVED_URL) {
        return Boolean(hasGoogleSource || hasDirectSource || hasDirectResolved);
      }

      return Boolean(hasGoogleSource);
    }
  );
  const workingSet =
    SAMPLE_LIMIT > 0
      ? targetArticles.slice(SAMPLE_OFFSET, SAMPLE_OFFSET + SAMPLE_LIMIT)
      : targetArticles;

  console.log(`Loaded ${articles.length} articles.`);
  console.log(`Estimated dates remaining before backfill: ${estimatedCount}`);
  console.log(`Checked fallback estimates skipped this run: ${RETRY_CHECKED_FALLBACKS ? 0 : checkedFallbackCount}`);
  console.log(
    `Recovery mode: ${
      [
        SKIP_GOOGLE_RSS ? 'publisher-direct' : null,
        TARGET_CHECKED_FALLBACKS_ONLY ? 'checked-fallbacks-only' : null,
        PREFER_RESOLVED_URL ? 'prefer-resolved-url' : null,
        TARGET_NON_GOOGLE_DIRECT_ONLY ? 'non-google-direct-only' : null,
        TARGET_GOOGLE_SOURCE_ONLY ? 'google-source-only' : null,
        SKIP_GENERIC_GOOGLE_TITLES ? 'skip-generic-google' : null,
        GOOGLE_DECODE_RETRIES > 0 ? `google-decode-retries-${GOOGLE_DECODE_RETRIES}` : null,
        GOOGLE_DECODE_RETRY_DELAY_MS > 0 ? `google-decode-retry-delay-${GOOGLE_DECODE_RETRY_DELAY_MS}ms` : null,
        BATCH_DELAY_MS > 0 ? `batch-delay-${BATCH_DELAY_MS}ms` : null,
      ]
        .filter(Boolean)
        .join(', ') || 'default'
    }`
  );
  console.log(`Estimated articles targeted this run: ${workingSet.length}`);
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
