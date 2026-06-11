export interface NewsArchiveArticle {
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
}

export type NewsArchiveDateQuality =
  | 'all'
  | 'verified'
  | 'estimated'
  | 'original_feed'
  | 'article_metadata';

export interface NewsArchiveFilters {
  search: string;
  sources: string[];
  sectors: string[];
  provinces: string[];
  month: string;
  dateQuality?: NewsArchiveDateQuality;
}

export function isVerifiedNewsDate(article: NewsArchiveArticle) {
  return (
    Boolean(article.date_source) &&
    article.is_estimated !== true &&
    article.date_source !== 'fallback_estimate'
  );
}

export function getNewsDateSourceLabel(dateSource?: string) {
  switch (dateSource) {
    case 'original_feed':
      return 'Tanggal dari feed asli';
    case 'article_metadata':
      return 'Tanggal dari metadata artikel';
    case 'fallback_estimate':
      return 'Tanggal estimasi';
    default:
      return 'Tanggal belum diberi sumber';
  }
}

function matchesDateQuality(article: NewsArchiveArticle, quality: NewsArchiveDateQuality) {
  if (quality === 'all') {
    return true;
  }

  if (quality === 'verified') {
    return isVerifiedNewsDate(article);
  }

  if (quality === 'estimated') {
    return !isVerifiedNewsDate(article);
  }

  return article.date_source === quality;
}

export function filterNewsArchive(
  articles: NewsArchiveArticle[],
  filters: NewsArchiveFilters
) {
  const search = filters.search.trim().toLowerCase();
  const dateQuality = filters.dateQuality || 'all';

  return articles.filter((article) => {
    const title = article.title || '';
    const excerpt = article.excerpt || '';
    const searchableText = `${title} ${excerpt}`.toLowerCase();

    if (search && !searchableText.includes(search)) {
      return false;
    }

    if (filters.sources.length > 0 && !filters.sources.includes(article.source || '')) {
      return false;
    }

    if (
      filters.sectors.length > 0 &&
      !article.sector_tags?.some((tag) => filters.sectors.includes(tag))
    ) {
      return false;
    }

    if (
      filters.provinces.length > 0 &&
      !filters.provinces.some((province) => searchableText.includes(province.toLowerCase()))
    ) {
      return false;
    }

    if (filters.month && !article.date?.startsWith(filters.month)) {
      return false;
    }

    if (!matchesDateQuality(article, dateQuality)) {
      return false;
    }

    return true;
  });
}

export function paginateNewsArchive(
  articles: NewsArchiveArticle[],
  page: number,
  itemsPerPage: number
) {
  const start = (page - 1) * itemsPerPage;
  return articles.slice(start, start + itemsPerPage);
}

export function sortNewsArchiveByDate(articles: NewsArchiveArticle[]) {
  return articles
    .slice()
    .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
}
