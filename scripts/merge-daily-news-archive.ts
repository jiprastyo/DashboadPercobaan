import fs from 'fs';
import path from 'path';
import {
  LABOR_KEYWORDS,
  tagKBLI,
  timestamp,
} from './config';
import { NEWS_SOURCES } from '../src/lib/constants';

interface DailyNewsArticle {
  title?: string;
  link?: string;
  date?: string;
  published_at?: string;
  summary?: string;
  outlet?: string;
  kbli_sectors?: Array<{ code?: string; name?: string }>;
  _source_url?: string;
  _scraped_at?: string;
  is_estimated?: boolean;
  date_checked_at?: string;
  date_source?: string;
  resolved_url?: string;
}

interface ArchiveArticle {
  id?: string;
  title?: string;
  date?: string;
  source?: string;
  source_name?: string;
  excerpt?: string;
  sector_tags?: string[];
  keywords_matched?: string[];
  _source_url?: string;
  _scraped_at?: string;
  is_estimated?: boolean;
  date_checked_at?: string;
  date_source?: string;
  resolved_url?: string;
  published_at?: string;
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

function isGoogleNewsUrl(url?: string) {
  return /^https?:\/\/news\.google\.com\//i.test(String(url || ''));
}

function isRealPublisherUrl(url?: string) {
  return /^https?:\/\//i.test(String(url || '')) && !isGoogleNewsUrl(url);
}

function normalizeUrl(url?: string) {
  return (url || '').trim().replace(/[#?].*$/, '').replace(/\/$/, '').toLowerCase();
}

function realPublisherUrl(article: { resolved_url?: string; _source_url?: string; link?: string }) {
  if (isRealPublisherUrl(article.resolved_url)) return article.resolved_url;
  if (isRealPublisherUrl(article._source_url)) return article._source_url;
  const link = (article as { link?: string }).link;
  if (isRealPublisherUrl(link)) return link;
  return '';
}

function parseIso(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function stableId(article: DailyNewsArticle) {
  const urlPart = slugify(normalizeUrl(article.resolved_url || article.link || article._source_url));
  const titlePart = slugify(article.title || 'untitled');
  return `daily-${urlPart || titlePart}`;
}

function sourceIdFor(article: DailyNewsArticle) {
  const outlet = (article.outlet || '').toLowerCase();
  const matched = NEWS_SOURCES.find((source) => {
    const sourceName = source.name.toLowerCase();
    return outlet === sourceName || outlet.includes(sourceName) || sourceName.includes(outlet);
  });

  return matched?.id || slugify(article.outlet || 'news');
}

function hasWord(phrase: string, text: string) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function verifiedDateSource(article: DailyNewsArticle | ArchiveArticle) {
  if (VERIFIED_DATE_SOURCES.has(String(article.date_source || ''))) {
    return String(article.date_source);
  }
  return article.date || article.published_at ? 'original_feed' : '';
}

function curateArchiveArticle(article: ArchiveArticle): ArchiveArticle | null {
  const url = realPublisherUrl(article);
  const date = parseIso(article.date || article.published_at);
  const dateSource = verifiedDateSource(article);

  if (!url || !date || article.is_estimated === true || !VERIFIED_DATE_SOURCES.has(dateSource)) {
    return null;
  }

  return {
    ...article,
    date,
    sector_tags: article.sector_tags?.length ? article.sector_tags : ['general'],
    keywords_matched: article.keywords_matched || [],
    resolved_url: url,
    _source_url: article._source_url || url,
    published_at: article.published_at || date,
    is_estimated: false,
    date_source: dateSource,
    date_checked_at: article.date_checked_at || timestamp(),
  };
}

function toArchiveArticle(article: DailyNewsArticle): ArchiveArticle | null {
  const url = realPublisherUrl(article);
  const date = parseIso(article.published_at || article.date);
  const dateSource = verifiedDateSource(article);

  if (!url || !date || article.is_estimated === true || !VERIFIED_DATE_SOURCES.has(dateSource)) {
    return null;
  }

  const text = `${article.title || ''} ${article.summary || ''}`;
  const source = sourceIdFor(article);
  const sectors = uniqueStrings([
    ...(article.kbli_sectors || []).map((sector) => sector.code),
    ...tagKBLI(text).map((sector) => sector.code),
  ]);
  const keywords = uniqueStrings(LABOR_KEYWORDS.filter((keyword) => hasWord(keyword, text)).slice(0, 5));

  return {
    id: stableId({ ...article, resolved_url: url }),
    title: article.title || 'Tanpa judul',
    date,
    source,
    source_name: article.outlet || source,
    excerpt: article.summary || '',
    sector_tags: sectors.length ? sectors : ['general'],
    keywords_matched: keywords,
    _source_url: article._source_url || url,
    _scraped_at: article._scraped_at || timestamp(),
    is_estimated: false,
    date_checked_at: timestamp(),
    date_source: dateSource,
    resolved_url: url,
    published_at: article.published_at || date,
  };
}

function loadDailyNewsFiles() {
  return fs
    .readdirSync(newsDir)
    .filter((fileName) => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName))
    .sort();
}

function main() {
  const rawArchive = readJson<ArchiveArticle[]>(archivePath);
  const archive: ArchiveArticle[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  let purgedExisting = 0;

  for (const article of rawArchive) {
    const curated = curateArchiveArticle(article);
    if (!curated) {
      purgedExisting += 1;
      continue;
    }

    const urlKey = normalizeUrl(curated.resolved_url);
    const titleKey = `${curated.title || ''}|${(curated.date || '').slice(0, 10)}`.toLowerCase();
    if ((urlKey && seenUrls.has(urlKey)) || seenTitles.has(titleKey)) {
      purgedExisting += 1;
      continue;
    }

    archive.push(curated);
    if (urlKey) seenUrls.add(urlKey);
    seenTitles.add(titleKey);
  }

  const added: ArchiveArticle[] = [];
  let skippedDaily = 0;

  for (const fileName of loadDailyNewsFiles()) {
    const dailyArticles = readJson<DailyNewsArticle[]>(path.join(newsDir, fileName));

    for (const article of dailyArticles) {
      const archiveArticle = toArchiveArticle(article);
      if (!archiveArticle) {
        skippedDaily += 1;
        continue;
      }

      const urlKey = normalizeUrl(archiveArticle.resolved_url);
      const titleKey = `${archiveArticle.title || ''}|${(archiveArticle.date || '').slice(0, 10)}`.toLowerCase();

      if ((urlKey && seenUrls.has(urlKey)) || seenTitles.has(titleKey)) {
        continue;
      }

      added.push(archiveArticle);
      if (urlKey) seenUrls.add(urlKey);
      seenTitles.add(titleKey);
    }
  }

  if (purgedExisting > 0 || added.length > 0) {
    archive.unshift(...added);
    archive.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    writeJson(archivePath, archive);
  }

  console.log(`Curated ${purgedExisting} existing archive row(s)`);
  console.log(`Skipped ${skippedDaily} daily row(s) without verified publisher URL/date`);
  console.log(`Merged ${added.length} daily article(s) into ${archivePath}`);
}

main();
