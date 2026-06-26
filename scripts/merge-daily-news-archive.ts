import fs from 'fs';
import path from 'path';
import {
  LABOR_KEYWORDS,
  tagKBLI,
  timestamp,
} from './config';
import { NEWS_SOURCES } from '../src/lib/constants';
import {
  isIndonesianNewsPublisherUrl,
  isPlausibleNewsPublicationDate,
  isRealPublisherUrl,
  normalizeNewsTitle,
  normalizePublisherUrl,
} from '../src/lib/news-quality';

interface NewsArticle {
  id?: string;
  title?: string;
  link?: string;
  date?: string;
  published_at?: string;
  summary?: string;
  excerpt?: string;
  outlet?: string;
  source?: string;
  source_name?: string;
  categories?: string[];
  kbli_sectors?: Array<{ code?: string; name?: string }>;
  sector_tags?: string[];
  keywords_matched?: string[];
  _source_url?: string;
  _scraped_at?: string;
  is_estimated?: boolean;
  date_checked_at?: string;
  date_source?: string;
  resolved_url?: string;
  [key: string]: unknown;
}

const root = process.cwd();
const newsDir = path.join(root, 'data', 'news');
const archivePath = path.join(newsDir, 'historical-seed.json');
const VERIFIED_DATE_SOURCES = new Set(['original_feed', 'article_metadata']);

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseIso(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function sourceIdFor(article: NewsArticle) {
  if (article.source) return article.source;

  const outlet = (article.outlet || article.source_name || '').toLowerCase();
  const matched = NEWS_SOURCES.find((source) => {
    const sourceName = source.name.toLowerCase();
    return outlet === sourceName || outlet.includes(sourceName) || sourceName.includes(outlet);
  });

  return matched?.id || slugify(article.outlet || article.source_name || 'news');
}

function hasWord(phrase: string, text: string) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function realPublisherUrl(article: NewsArticle) {
  for (const candidate of [article.resolved_url, article.link, article._source_url]) {
    if (isRealPublisherUrl(candidate)) return candidate!;
  }
  return '';
}

function verifiedDateSource(article: NewsArticle) {
  return VERIFIED_DATE_SOURCES.has(String(article.date_source || ''))
    ? String(article.date_source)
    : '';
}

function matchingKeywords(article: NewsArticle) {
  const text = `${article.title || ''} ${article.summary || article.excerpt || ''}`;
  return uniqueStrings([
    ...(article.keywords_matched || []),
    ...LABOR_KEYWORDS.filter((keyword) => hasWord(keyword, text)).slice(0, 8),
  ]);
}

function stableId(article: NewsArticle, publisherUrl: string) {
  const urlPart = slugify(normalizePublisherUrl(publisherUrl));
  const titlePart = slugify(normalizeNewsTitle(article.title));
  return article.id || `daily-${urlPart || titlePart}`;
}

function curateArticle(article: NewsArticle): NewsArticle | null {
  const publisherUrl = realPublisherUrl(article);
  const date = parseIso(article.published_at || article.date);
  const dateSource = verifiedDateSource(article);
  const keywords = matchingKeywords(article);

  if (
    !publisherUrl ||
    !date ||
    article.is_estimated === true ||
    !VERIFIED_DATE_SOURCES.has(dateSource) ||
    !isIndonesianNewsPublisherUrl(publisherUrl) ||
    !isPlausibleNewsPublicationDate(date, publisherUrl) ||
    keywords.length === 0
  ) {
    return null;
  }

  const text = `${article.title || ''} ${article.summary || article.excerpt || ''}`;
  const sectors = uniqueStrings([
    ...(article.sector_tags || []),
    ...(article.kbli_sectors || []).map((sector) => sector.code),
    ...tagKBLI(text).map((sector) => sector.code),
  ]);
  const source = sourceIdFor(article);

  return {
    ...article,
    id: stableId(article, publisherUrl),
    title: article.title || 'Tanpa judul',
    date,
    published_at: date,
    source,
    source_name: article.source_name || article.outlet || source,
    excerpt: article.excerpt || article.summary || '',
    sector_tags: sectors.length ? sectors : ['general'],
    keywords_matched: keywords,
    _source_url: article._source_url || publisherUrl,
    _scraped_at: article._scraped_at || timestamp(),
    is_estimated: false,
    date_checked_at: article.date_checked_at || timestamp(),
    date_source: dateSource,
    resolved_url: publisherUrl,
  };
}

function richnessScore(article: NewsArticle) {
  let score = 0;
  if (article.date_source === 'article_metadata') score += 30;
  if (article.date_source === 'original_feed') score += 20;
  if (isRealPublisherUrl(article.resolved_url)) score += 20;
  score += Math.min(String(article.excerpt || '').length, 500) / 50;
  score += (article.keywords_matched || []).length * 2;
  score += (article.sector_tags || []).length;
  if (article.source_name) score += 2;
  return score;
}

function mergeRichest(left: NewsArticle, right: NewsArticle) {
  const [keeper, supplement] =
    richnessScore(right) > richnessScore(left) ? [right, left] : [left, right];

  return {
    ...supplement,
    ...keeper,
    excerpt: String(keeper.excerpt || supplement.excerpt || ''),
    keywords_matched: uniqueStrings([
      ...(keeper.keywords_matched || []),
      ...(supplement.keywords_matched || []),
    ]),
    sector_tags: uniqueStrings([
      ...(keeper.sector_tags || []),
      ...(supplement.sector_tags || []),
    ]),
    duplicate_count: Number(left.duplicate_count || 1) + Number(right.duplicate_count || 1),
    duplicate_ids: uniqueStrings([
      left.id,
      right.id,
      ...((left.duplicate_ids as string[] | undefined) || []),
      ...((right.duplicate_ids as string[] | undefined) || []),
    ]),
  };
}

function loadDailyNewsFiles() {
  return fs
    .readdirSync(newsDir)
    .filter((fileName) => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName))
    .sort();
}

function main() {
  const rawArchive = readJson<NewsArticle[]>(archivePath);
  const candidates: NewsArticle[] = [...rawArchive];

  for (const fileName of loadDailyNewsFiles()) {
    const filePath = path.join(newsDir, fileName);
    const dailyRows = readJson<NewsArticle[]>(filePath);
    const validDailyRows = dailyRows.filter((article) => Boolean(curateArticle(article)));
    if (validDailyRows.length !== dailyRows.length) {
      writeJson(filePath, validDailyRows);
    }
    candidates.push(...validDailyRows);
  }

  const accepted: NewsArticle[] = [];
  const byUrl = new Map<string, number>();
  const byTitle = new Map<string, number>();
  let rejected = 0;
  let duplicates = 0;

  for (const candidate of candidates) {
    const curated = curateArticle(candidate);
    if (!curated) {
      rejected += 1;
      continue;
    }

    const urlKey = normalizePublisherUrl(curated.resolved_url);
    const titleKey = normalizeNewsTitle(curated.title);
    const existingIndex = byUrl.get(urlKey) ?? byTitle.get(titleKey);

    if (existingIndex !== undefined) {
      const merged = mergeRichest(accepted[existingIndex], curated);
      accepted[existingIndex] = merged;
      byUrl.set(normalizePublisherUrl(merged.resolved_url), existingIndex);
      byTitle.set(normalizeNewsTitle(merged.title), existingIndex);
      duplicates += 1;
      continue;
    }

    const nextIndex = accepted.length;
    accepted.push(curated);
    byUrl.set(urlKey, nextIndex);
    byTitle.set(titleKey, nextIndex);
  }

  accepted.sort((left, right) => Date.parse(String(right.date)) - Date.parse(String(left.date)));
  writeJson(archivePath, accepted);

  console.log(`Accepted ${accepted.length} archive article(s)`);
  console.log(`Rejected ${rejected} invalid, old, estimated, unresolved, or off-topic row(s)`);
  console.log(`Collapsed ${duplicates} duplicate row(s) by publisher URL or normalized title`);
}

main();
