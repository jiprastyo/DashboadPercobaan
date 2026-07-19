import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import {
  LABOR_KEYWORDS,
  NEWS,
  NEWS_OUTLETS,
  fetchWithRetry,
  log,
  matchesKeywords,
  tagKBLI,
  timestamp,
} from './config';
import {
  isPlausibleNewsPublicationDate,
  isRealPublisherUrl,
  normalizeNewsTitle,
  normalizePublisherUrl,
} from '../src/lib/news-quality';

type RecoveredArticle = {
  title: string;
  link: string;
  date: string;
  published_at: string;
  summary: string;
  outlet: string;
  categories: string[];
  kbli_sectors: Array<{ code: string; name: string }>;
  _source_url: string;
  _scraped_at: string;
  is_estimated: false;
  date_source: 'original_feed';
  resolved_url: string;
};

type RecoveryManifest = {
  started_at: string;
  finished_at?: string;
  start_date: string;
  before_date: string;
  status: 'running' | 'success' | 'partial' | 'error';
  direct_items: number;
  google_items: number;
  accepted_items: number;
  google_circuit_open: boolean;
  errors: string[];
};

const parser = new Parser();
const startDate = process.env.START_DATE || '2026-06-24';
const beforeDate =
  process.env.BEFORE_DATE ||
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const manifestPath = path.join(process.cwd(), 'data', 'recovery', 'news-recovery-state.json');
const GOOGLE_FAILURE_LIMIT = Number(process.env.GOOGLE_FAILURE_LIMIT || '3');
const GOOGLE_QUERY_DELAY_MS = Number(process.env.GOOGLE_QUERY_DELAY_MS || '1200');
const MAX_GOOGLE_ITEMS_PER_QUERY = Number(process.env.MAX_GOOGLE_ITEMS_PER_QUERY || '30');
const GOOGLE_DECODE_CONCURRENCY = Number(process.env.GOOGLE_DECODE_CONCURRENCY || '5');
const QUERY_BATCHES = [
  '"PHK" OR "pemutusan hubungan kerja" OR "tenaga kerja" OR "pengangguran"',
  '"lowongan kerja" OR "lapangan kerja" OR "upah" OR "buruh"',
  '"BPJS Ketenagakerjaan" OR "serikat pekerja" OR "job fair" OR "pekerja"',
];

const manifest: RecoveryManifest = {
  started_at: timestamp(),
  start_date: startDate,
  before_date: beforeDate,
  status: 'running',
  direct_items: 0,
  google_items: 0,
  accepted_items: 0,
  google_circuit_open: false,
  errors: [],
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

function writeManifest() {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

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

function inRequestedWindow(value: string) {
  const day = value.slice(0, 10);
  return day >= startDate && day < beforeDate;
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

async function decodeGoogleNewsUrl(value: string) {
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

function buildArticle(
  outlet: string,
  item: Parser.Item & { description?: string },
  publisherUrl: string,
): RecoveredArticle | null {
  const publishedAt = toIso(item.isoDate || item.pubDate);
  const title = stripHtml(item.title);
  const summary = stripHtml(item.description || item.contentSnippet);
  const text = `${title} ${summary}`;

  if (
    !title ||
    !publishedAt ||
    !inRequestedWindow(publishedAt) ||
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
    summary,
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

async function collectDirectFeeds() {
  const recovered: RecoveredArticle[] = [];
  for (const outlet of NEWS_OUTLETS.filter((item) => item.type === 'rss')) {
    for (const url of outlet.urls) {
      try {
        const response = await fetchWithRetry(url, {}, 1);
        const feed = await parser.parseString(await response.text());
        for (const item of feed.items || []) {
          const article = buildArticle(outlet.name, item, item.link || '');
          if (article) recovered.push(article);
        }
      } catch (error) {
        manifest.errors.push(`direct:${outlet.name}:${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  manifest.direct_items = recovered.length;
  writeManifest();
  return recovered;
}

async function collectGoogleFallback() {
  const recovered: RecoveredArticle[] = [];
  let consecutiveFailures = 0;
  for (const queryBatch of QUERY_BATCHES) {
    if (consecutiveFailures >= GOOGLE_FAILURE_LIMIT) {
      manifest.google_circuit_open = true;
      writeManifest();
      return recovered;
    }

    const query = `(${queryBatch}) after:${startDate} before:${beforeDate}`;
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`;

    try {
      const response = await fetchWithRetry(rssUrl, {}, 1);
      const feed = await parser.parseString(await response.text());
      consecutiveFailures = 0;

      const candidates = (feed.items || [])
        .map((rawItem) => rawItem as Parser.Item & { description?: string; source?: string | { name?: string } })
        .filter((item) => {
          const publishedAt = toIso(item.isoDate || item.pubDate);
          const title = stripHtml(item.title);
          const summary = stripHtml(item.description || item.contentSnippet);
          return Boolean(
            item.link &&
            publishedAt &&
            inRequestedWindow(publishedAt) &&
            matchesKeywords(`${title} ${summary}`, LABOR_KEYWORDS),
          );
        })
        .slice(0, MAX_GOOGLE_ITEMS_PER_QUERY);

      const decoded = await mapWithConcurrency(
        candidates,
        GOOGLE_DECODE_CONCURRENCY,
        async (item) => {
          try {
            const publisherUrl = await decodeGoogleNewsUrl(item.link!);
            const sourceValue = item.source;
            const outletName =
              typeof sourceValue === 'string'
                ? sourceValue
                : sourceValue?.name ||
                  (isRealPublisherUrl(publisherUrl)
                    ? new URL(publisherUrl).hostname.replace(/^www\./, '')
                    : 'Google News');
            return buildArticle(outletName, item, publisherUrl);
          } catch (error) {
            manifest.errors.push(`decode:${error instanceof Error ? error.message : String(error)}`);
            return null;
          }
        },
      );
      recovered.push(...decoded.filter((article): article is RecoveredArticle => Boolean(article)));
      manifest.google_items = recovered.length;
      writeManifest();
    } catch (error) {
      consecutiveFailures += 1;
      manifest.errors.push(`google:${error instanceof Error ? error.message : String(error)}`);
      writeManifest();
    }

    await sleep(GOOGLE_QUERY_DELAY_MS);
  }

  manifest.google_items = recovered.length;
  return recovered;
}

function persistRecovered(articles: RecoveredArticle[]) {
  const unique = new Map<string, RecoveredArticle>();
  for (const article of articles) {
    const key = normalizePublisherUrl(article.resolved_url) || normalizeNewsTitle(article.title);
    if (!unique.has(key)) unique.set(key, article);
  }

  for (const article of unique.values()) {
    const day = article.date.slice(0, 10);
    const filePath = path.join(NEWS.dataDir, `${day}.json`);
    const existing = fs.existsSync(filePath)
      ? (JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RecoveredArticle[])
      : [];
    const existingKeys = new Set(
      existing.map((item) => normalizePublisherUrl(item.resolved_url) || normalizeNewsTitle(item.title)),
    );
    if (!existingKeys.has(normalizePublisherUrl(article.resolved_url) || normalizeNewsTitle(article.title))) {
      existing.push(article);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, `${JSON.stringify(existing, null, 2)}\n`);
      manifest.accepted_items += 1;
    }
  }
}

async function main() {
  writeManifest();
  const direct = await collectDirectFeeds();
  const google = await collectGoogleFallback();
  manifest.google_items = google.length;
  persistRecovered([...direct, ...google]);
  manifest.finished_at = timestamp();
  manifest.status = manifest.google_circuit_open || manifest.errors.length > 0 ? 'partial' : 'success';
  writeManifest();
  log(
    'recover-news-range',
    `status=${manifest.status} direct=${manifest.direct_items} google=${manifest.google_items} accepted=${manifest.accepted_items}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    manifest.finished_at = timestamp();
    manifest.status = 'error';
    manifest.errors.push(error instanceof Error ? error.message : String(error));
    writeManifest();
    console.error(error);
    process.exit(1);
  });
