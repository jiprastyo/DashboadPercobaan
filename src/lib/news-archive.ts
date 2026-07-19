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

import {
  isPlausibleNewsPublicationDate,
  isRealPublisherUrl,
} from './news-quality';

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
  keywords: string[];
  provinces: string[];
  month: string;
  dateQuality?: NewsArchiveDateQuality;
}

export function isVerifiedNewsDate(article: NewsArchiveArticle) {
  const publisherUrl = article.resolved_url || article.link || article._source_url;
  return (
    (article.date_source === 'original_feed' || article.date_source === 'article_metadata') &&
    article.is_estimated !== true &&
    isRealPublisherUrl(publisherUrl) &&
    isPlausibleNewsPublicationDate(article.published_at || article.date, publisherUrl)
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
      filters.keywords.length > 0 &&
      !article.keywords_matched?.some((keyword) => filters.keywords.includes(keyword))
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

export function getNewsArchiveTimestamp(article: NewsArchiveArticle) {
  const timestamp = new Date(article.date || '').getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function getNewsArchiveMonth(article: NewsArchiveArticle) {
  if (!article.date || !/^\d{4}-\d{2}/.test(article.date)) {
    return null;
  }
  return article.date.slice(0, 7);
}

export function sortNewsArchiveByDate(articles: NewsArchiveArticle[]) {
  return articles
    .slice()
    .sort((a, b) => getNewsArchiveTimestamp(b) - getNewsArchiveTimestamp(a));
}
