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
  summary?: string;
  outlet?: string;
  kbli_sectors?: Array<{ code?: string; name?: string }>;
  _source_url?: string;
  _scraped_at?: string;
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
}

const root = process.cwd();
const newsDir = path.join(root, 'data', 'news');
const archivePath = path.join(newsDir, 'historical-seed.json');

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeUrl(url?: string) {
  return (url || '').trim().replace(/[#?].*$/, '').replace(/\/$/, '').toLowerCase();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function stableId(article: DailyNewsArticle) {
  const urlPart = slugify(normalizeUrl(article.link || article._source_url));
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

function toArchiveArticle(article: DailyNewsArticle): ArchiveArticle {
  const text = `${article.title || ''} ${article.summary || ''}`;
  const date = article.date || article._scraped_at || timestamp();
  const source = sourceIdFor(article);
  const sectors = uniqueStrings([
    ...(article.kbli_sectors || []).map((sector) => sector.code),
    ...tagKBLI(text).map((sector) => sector.code),
  ]);
  const keywords = uniqueStrings(LABOR_KEYWORDS.filter((keyword) => hasWord(keyword, text)).slice(0, 5));

  return {
    id: stableId(article),
    title: article.title || 'Tanpa judul',
    date,
    source,
    source_name: article.outlet || source,
    excerpt: article.summary || '',
    sector_tags: sectors,
    keywords_matched: keywords,
    _source_url: article.link || article._source_url,
    _scraped_at: article._scraped_at || timestamp(),
    is_estimated: !article.date,
    date_checked_at: timestamp(),
    date_source: article.date ? 'original_feed' : 'fallback_estimate',
    resolved_url: article.link || article._source_url,
    published_at: article.date || undefined,
  };
}

function loadDailyNewsFiles() {
  return fs
    .readdirSync(newsDir)
    .filter((fileName) => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName))
    .sort();
}

function main() {
  const archive = readJson<ArchiveArticle[]>(archivePath);
  const seenUrls = new Set(archive.map((article) => normalizeUrl(article._source_url || article.resolved_url)));
  const seenTitles = new Set(archive.map((article) => `${article.title || ''}|${(article.date || '').slice(0, 10)}`.toLowerCase()));
  const added: ArchiveArticle[] = [];

  for (const fileName of loadDailyNewsFiles()) {
    const dailyArticles = readJson<DailyNewsArticle[]>(path.join(newsDir, fileName));

    for (const article of dailyArticles) {
      const urlKey = normalizeUrl(article.link || article._source_url);
      const titleKey = `${article.title || ''}|${(article.date || '').slice(0, 10)}`.toLowerCase();

      if ((urlKey && seenUrls.has(urlKey)) || seenTitles.has(titleKey)) {
        continue;
      }

      const archiveArticle = toArchiveArticle(article);
      added.push(archiveArticle);
      if (urlKey) {
        seenUrls.add(urlKey);
      }
      seenTitles.add(titleKey);
    }
  }

  if (added.length > 0) {
    archive.unshift(...added);
    archive.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    writeJson(archivePath, archive);
  }

  console.log(`Merged ${added.length} daily article(s) into ${archivePath}`);
}

main();
