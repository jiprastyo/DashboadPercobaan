export interface NewsArchiveArticle {
  id?: string;
  title?: string;
  date?: string;
  source?: string;
  source_name?: string;
  excerpt?: string;
  sector_tags?: string[];
  keywords_matched?: string[];
  _source_url?: string;
  link?: string;
  is_estimated?: boolean;
}

export interface NewsArchiveFilters {
  search: string;
  sources: string[];
  sectors: string[];
  provinces: string[];
  month: string;
}

export function filterNewsArchive(
  articles: NewsArchiveArticle[],
  filters: NewsArchiveFilters
) {
  const search = filters.search.trim().toLowerCase();

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
