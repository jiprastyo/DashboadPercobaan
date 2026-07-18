import fs from 'fs';
import path from 'path';

type NewsArchiveArticle = Record<string, unknown> & {
  id?: string;
  title?: string;
  date?: string;
  published_at?: string;
  source?: string;
  source_name?: string;
  excerpt?: string;
  sector_tags?: string[];
  keywords_matched?: string[];
  _source_url?: string;
  link?: string;
  resolved_url?: string;
  is_estimated?: boolean;
  date_source?: string;
  date_checked_at?: string;
  duplicate_count?: number;
  duplicate_ids?: string[];
  duplicate_sources?: string[];
  duplicate_source_names?: string[];
};

type DuplicateGroup = {
  keptIndex: number;
  removedIndices: number[];
};

const root = process.cwd();
const archivePath = path.join(root, 'data', 'news', 'historical-seed.json');
const shouldWrite = process.argv.includes('--write');
const FUZZY_TITLE_THRESHOLD = 0.92;
const MIN_FUZZY_TITLE_TOKENS = 5;
const TITLE_STOP_WORDS = new Set([
  'dan',
  'di',
  'ke',
  'dari',
  'yang',
  'untuk',
  'dengan',
  'ini',
  'itu',
  'the',
  'news',
  'berita',
]);

function decodeText(value: unknown) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

function articleDay(article: NewsArchiveArticle) {
  return String(article.date || '').slice(0, 10);
}

function normalizeTitle(value: unknown) {
  return decodeText(value)
    .toLowerCase()
    .replace(/\s+-\s+([a-z0-9 .,'&()]+)$/i, '')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleTokens(article: NewsArchiveArticle) {
  return normalizeTitle(article.title)
    .split(' ')
    .filter((token) => token.length > 2 && !TITLE_STOP_WORDS.has(token));
}

function jaccardSimilarity(aTokens: string[], bTokens: string[]) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  let intersection = 0;

  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalizeUrl(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = url.pathname.replace(/\/+$/, '').toLowerCase();

    if (!pathname || pathname === '/' || pathname.includes('/rss/search')) {
      return '';
    }

    return `${host}${pathname}`;
  } catch {
    return trimmed
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?/, '')
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '');
  }
}

function canonicalUrl(article: NewsArchiveArticle) {
  return (
    normalizeUrl(article.resolved_url) ||
    normalizeUrl(article._source_url) ||
    normalizeUrl(article.link)
  );
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== undefined && value !== null && String(value).trim() !== '';
}

function dateSourceScore(article: NewsArchiveArticle) {
  if (article.date_source === 'article_metadata') {
    return 450;
  }

  if (article.date_source === 'original_feed') {
    return 400;
  }

  if (article.date_source === 'fallback_estimate') {
    return 50;
  }

  return 0;
}

function metadataScore(article: NewsArchiveArticle) {
  let score = dateSourceScore(article);

  const weightedFields: [keyof NewsArchiveArticle, number][] = [
    ['resolved_url', 140],
    ['published_at', 120],
    ['date_checked_at', 100],
    ['date', 80],
    ['_source_url', 70],
    ['link', 60],
    ['source_name', 50],
    ['source', 40],
    ['title', 40],
    ['excerpt', 30],
    ['id', 20],
  ];

  for (const [field, weight] of weightedFields) {
    if (hasValue(article[field])) {
      score += weight;
    }
  }

  score += (article.keywords_matched?.length || 0) * 12;
  score += (article.sector_tags?.filter((tag) => tag !== 'general').length || 0) * 12;
  score += Math.min((article.excerpt || '').length, 300) / 10;

  if (article.is_estimated === false) {
    score += 80;
  }

  return score;
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
        .map((value) => value.trim())
    )
  );
}

function chooseScalar<T extends keyof NewsArchiveArticle>(
  keeper: NewsArchiveArticle,
  duplicate: NewsArchiveArticle,
  field: T
) {
  if (!hasValue(keeper[field]) && hasValue(duplicate[field])) {
    keeper[field] = duplicate[field];
  }
}

function mergeIntoKeeper(keeper: NewsArchiveArticle, duplicates: NewsArchiveArticle[]) {
  for (const duplicate of duplicates) {
    keeper.sector_tags = uniqueStrings([keeper.sector_tags, duplicate.sector_tags]);
    keeper.keywords_matched = uniqueStrings([keeper.keywords_matched, duplicate.keywords_matched]);

    for (const field of [
      'resolved_url',
      'published_at',
      'date_checked_at',
      'date',
      '_source_url',
      'link',
      'source_name',
      'source',
      'excerpt',
      'title',
      'id',
    ] as const) {
      chooseScalar(keeper, duplicate, field);
    }
  }

  const allRecords = [keeper, ...duplicates];
  keeper.duplicate_ids = uniqueStrings([
    allRecords.map((article) => article.id),
    allRecords.map((article) => article.duplicate_ids),
  ]);
  keeper.duplicate_sources = uniqueStrings([
    allRecords.map((article) => article.source),
    allRecords.map((article) => article.duplicate_sources),
  ]);
  keeper.duplicate_source_names = uniqueStrings([
    allRecords.map((article) => article.source_name),
    allRecords.map((article) => article.duplicate_source_names),
  ]);
  keeper.duplicate_count = Math.max(allRecords.length, keeper.duplicate_ids.length);

  if (keeper.duplicate_count <= 1) {
    delete keeper.duplicate_count;
    delete keeper.duplicate_ids;
    delete keeper.duplicate_sources;
    delete keeper.duplicate_source_names;
  }

  return keeper;
}

class DisjointSet {
  private parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
  }

  find(index: number): number {
    const parent = this.parent[index];
    if (parent === index) {
      return index;
    }

    const rootIndex = this.find(parent);
    this.parent[index] = rootIndex;
    return rootIndex;
  }

  union(a: number, b: number) {
    const rootA = this.find(a);
    const rootB = this.find(b);

    if (rootA !== rootB) {
      this.parent[rootB] = rootA;
    }
  }
}

function unionByKey(
  articles: NewsArchiveArticle[],
  dsu: DisjointSet,
  keyFor: (article: NewsArchiveArticle) => string
) {
  const seen = new Map<string, number>();

  articles.forEach((article, index) => {
    const key = keyFor(article);
    if (!key) {
      return;
    }

    const firstIndex = seen.get(key);
    if (firstIndex === undefined) {
      seen.set(key, index);
    } else {
      dsu.union(firstIndex, index);
    }
  });
}

function unionByFuzzyTitle(articles: NewsArchiveArticle[], dsu: DisjointSet) {
  const blocks = new Map<
    string,
    {
      index: number;
      day: string;
      tokens: string[];
    }[]
  >();

  articles.forEach((article, index) => {
    const day = articleDay(article);
    const tokens = titleTokens(article);

    if (!day || tokens.length < MIN_FUZZY_TITLE_TOKENS) {
      return;
    }

    const keyTokens = Array.from(new Set(tokens)).sort().slice(0, 3);
    const blockKey = `${day}|${keyTokens.join('|')}`;
    const block = blocks.get(blockKey);
    const record = { index, day, tokens };

    if (block) {
      block.push(record);
    } else {
      blocks.set(blockKey, [record]);
    }
  });

  for (const block of blocks.values()) {
    for (let i = 0; i < block.length; i += 1) {
      for (let j = i + 1; j < block.length; j += 1) {
        const a = block[i];
        const b = block[j];

        if (a.day === b.day && jaccardSimilarity(a.tokens, b.tokens) >= FUZZY_TITLE_THRESHOLD) {
          dsu.union(a.index, b.index);
        }
      }
    }
  }
}

function buildDuplicateGroups(articles: NewsArchiveArticle[]) {
  const dsu = new DisjointSet(articles.length);

  unionByKey(articles, dsu, (article) => article.id || '');
  unionByKey(articles, dsu, canonicalUrl);
  unionByFuzzyTitle(articles, dsu);

  const groups = new Map<number, number[]>();
  articles.forEach((_, index) => {
    const rootIndex = dsu.find(index);
    const group = groups.get(rootIndex);
    if (group) {
      group.push(index);
    } else {
      groups.set(rootIndex, [index]);
    }
  });

  return Array.from(groups.values()).filter((group) => group.length > 1);
}

function cleanArchive(articles: NewsArchiveArticle[]) {
  const duplicateGroups = buildDuplicateGroups(articles);
  const removed = new Set<number>();
  const groups: DuplicateGroup[] = [];

  for (const group of duplicateGroups) {
    const ranked = group
      .map((index) => ({ index, score: metadataScore(articles[index]) }))
      .sort((a, b) => b.score - a.score || a.index - b.index);
    const keptIndex = ranked[0].index;
    const removedIndices = ranked.slice(1).map((item) => item.index);

    mergeIntoKeeper(
      articles[keptIndex],
      removedIndices.map((index) => articles[index])
    );

    removedIndices.forEach((index) => removed.add(index));
    groups.push({ keptIndex, removedIndices });
  }

  return {
    articles: articles.filter((_, index) => !removed.has(index)),
    groups,
    removedCount: removed.size,
  };
}

const raw = fs.readFileSync(archivePath, 'utf8');
const articles = JSON.parse(raw) as NewsArchiveArticle[];
const before = articles.length;
const result = cleanArchive(articles);

const summary = {
  before,
  after: result.articles.length,
  removed: result.removedCount,
  duplicateGroups: result.groups.length,
};

console.log(JSON.stringify(summary, null, 2));

if (shouldWrite) {
  fs.writeFileSync(archivePath, `${JSON.stringify(result.articles, null, 2)}\n`);
}
