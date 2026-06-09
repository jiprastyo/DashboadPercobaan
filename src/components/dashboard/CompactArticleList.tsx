import { ExternalLink } from 'lucide-react';
import { formatDate, truncateText } from '@/lib/utils';

interface CompactArticle {
  title: string;
  date: string;
  summary?: string;
  sourceName?: string;
  url: string;
}

interface CompactArticleListProps {
  articles: CompactArticle[];
  emptyText: string;
  label: string;
}

export default function CompactArticleList({ articles, emptyText, label }: CompactArticleListProps) {
  if (articles.length === 0) {
    return <p className="py-4 text-center text-sm text-[var(--app-muted)]">{emptyText}</p>;
  }

  return (
    <div className="divide-y divide-[var(--app-border)]">
      {articles.slice(0, 5).map((article, index) => (
        <article key={`${article.title}-${index}`} className="py-3 first:pt-0 last:pb-0">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--app-subtle)]">
            <span>{article.sourceName || label}</span>
            <span>{formatDate(article.date)}</span>
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-1.5 text-sm font-bold leading-snug text-[var(--app-text)] hover:text-[var(--app-link)] focus-visible:app-focus"
          >
            <span>{article.title}</span>
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          </a>
          {article.summary && (
            <p className="mt-1 text-xs leading-relaxed text-[var(--app-muted)]">
              {truncateText(article.summary, 150)}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
