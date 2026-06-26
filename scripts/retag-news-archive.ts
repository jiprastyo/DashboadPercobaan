/**
 * Recompute labor keyword and KBLI sector tags for local news archive files.
 */

import fs from 'fs';
import path from 'path';
import {
  KBLI_SECTORS,
  LABOR_KEYWORDS,
  NEWS,
  ensureDir,
  matchesKeywords,
  tagKBLI,
  timestamp,
  writeJSON,
} from './config';

type KBLIHit = { code: string; name: string };

type NewsLikeArticle = {
  id?: string;
  title?: string;
  excerpt?: string;
  summary?: string;
  source?: string;
  source_name?: string;
  outlet?: string;
  categories?: string[];
  sector_tags?: string[];
  kbli_sectors?: KBLIHit[];
  keywords_matched?: string[];
  [key: string]: unknown;
};

type FileStats = {
  file: string;
  total: number;
  sectorChanged: number;
  keywordChanged: number;
  taggedAtLeastOneSector: number;
  taggedAtLeastOneKeyword: number;
};

const NEWS_FILES = ['historical-seed.json', '2026-06-06.json', '2026-06-07.json'];
const SECTOR_CODES = new Set(KBLI_SECTORS.map((sector) => sector.code));
const SECTOR_BY_CODE = new Map(KBLI_SECTORS.map((sector) => [sector.code, sector]));

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getArticleText(article: NewsLikeArticle): string {
  const categories = Array.isArray(article.categories) ? article.categories.join(' ') : '';
  return [
    article.title,
    article.excerpt,
    article.summary,
    article.source_name,
    article.outlet,
    categories,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ');
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function deriveKeywords(text: string): string[] {
  return LABOR_KEYWORDS.filter((keyword) => matchesKeywords(text, [keyword]));
}

function normalizeExistingSectorCodes(article: NewsLikeArticle): string[] {
  const fromSectorTags = Array.isArray(article.sector_tags)
    ? article.sector_tags.filter((tag): tag is string => typeof tag === 'string')
    : [];
  const fromKBLISectors = Array.isArray(article.kbli_sectors)
    ? article.kbli_sectors
        .map((sector) => sector?.code)
        .filter((code): code is string => typeof code === 'string')
    : [];

  return uniqueSorted([...fromSectorTags, ...fromKBLISectors])
    .map((code) => code.toLowerCase())
    .filter((code) => SECTOR_CODES.has(code));
}

function sectorsFromCodes(codes: string[]): KBLIHit[] {
  return codes
    .map((code) => SECTOR_BY_CODE.get(code))
    .filter((sector): sector is NonNullable<typeof sector> => Boolean(sector))
    .map((sector) => ({ code: sector.code, name: sector.name }));
}

function arraysEqual(a: string[] = [], b: string[] = []): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
}

function retagArticle(article: NewsLikeArticle): {
  article: NewsLikeArticle;
  sectorChanged: boolean;
  keywordChanged: boolean;
} {
  const text = getArticleText(article);
  const derivedSectors = tagKBLI(text).map((sector) => sector.code);
  const sectorCodes = uniqueSorted([...normalizeExistingSectorCodes(article), ...derivedSectors]);
  const keywords = uniqueSorted([
    ...(Array.isArray(article.keywords_matched)
      ? article.keywords_matched.filter((keyword): keyword is string => typeof keyword === 'string')
      : []),
    ...deriveKeywords(text),
  ]);

  const currentSectorTags = uniqueSorted(
    Array.isArray(article.sector_tags)
      ? article.sector_tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
  );
  const currentKeywords = uniqueSorted(
    Array.isArray(article.keywords_matched)
      ? article.keywords_matched.filter((keyword): keyword is string => typeof keyword === 'string')
      : [],
  );

  return {
    article: {
      ...article,
      sector_tags: sectorCodes,
      kbli_sectors: sectorsFromCodes(sectorCodes),
      keywords_matched: keywords,
      tagging_source: 'keyword_kbli_worker',
      tagged_at: timestamp(),
    },
    sectorChanged: !arraysEqual(currentSectorTags, sectorCodes),
    keywordChanged: !arraysEqual(currentKeywords, keywords),
  };
}

function retagFile(fileName: string): FileStats | null {
  const filePath = path.join(NEWS.dataDir, fileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const articles = JSON.parse(raw) as NewsLikeArticle[];
  if (!Array.isArray(articles)) {
    throw new Error(`${fileName} is not an article array`);
  }

  let sectorChanged = 0;
  let keywordChanged = 0;
  let taggedAtLeastOneSector = 0;
  let taggedAtLeastOneKeyword = 0;

  const retagged = articles.map((article) => {
    const result = retagArticle(article);
    if (result.sectorChanged) {
      sectorChanged += 1;
    }
    if (result.keywordChanged) {
      keywordChanged += 1;
    }
    if (result.article.sector_tags?.length) {
      taggedAtLeastOneSector += 1;
    }
    if (result.article.keywords_matched?.length) {
      taggedAtLeastOneKeyword += 1;
    }
    return result.article;
  });

  ensureDir(path.dirname(filePath));
  writeJSON(filePath, retagged);

  return {
    file: fileName,
    total: articles.length,
    sectorChanged,
    keywordChanged,
    taggedAtLeastOneSector,
    taggedAtLeastOneKeyword,
  };
}

function main() {
  const stats = NEWS_FILES.map(retagFile).filter((stat): stat is FileStats => Boolean(stat));

  for (const stat of stats) {
    console.log(
      [
        stat.file,
        `total=${stat.total}`,
        `sectorChanged=${stat.sectorChanged}`,
        `keywordChanged=${stat.keywordChanged}`,
        `withSector=${stat.taggedAtLeastOneSector}`,
        `withKeyword=${stat.taggedAtLeastOneKeyword}`,
      ].join(' '),
    );
  }
}

main();
