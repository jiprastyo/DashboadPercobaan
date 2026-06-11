import { ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { getNewsDateSourceLabel } from '@/lib/news-archive';
import { cn, truncateText } from '@/lib/utils';

interface NewsCardProps {
  title: string;
  date: string;
  source: string;
  sourceName: string;
  sourceColor?: string;
  excerpt: string;
  sectorTags?: string[];
  impactBadge?: {
    label: string;
    className: string;
    emoji: string;
  };
  summary?: string;
  url: string;
  isEstimated?: boolean;
  dateSource?: string;
  className?: string;
}

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatArticleDate(date: string) {
  try {
    const parsed = parseISO(date);
    if (!Number.isNaN(parsed.getTime())) {
      return format(parsed, 'dd MMM yyyy', { locale: id });
    }
  } catch {
    return date;
  }
  return date;
}

export default function NewsCard({
  title,
  date,
  sourceName,
  sourceColor,
  excerpt,
  sectorTags = [],
  impactBadge,
  summary,
  url,
  isEstimated,
  dateSource,
  className,
}: NewsCardProps) {
  const cleanTitle = cleanText(title);
  const cleanExcerpt = cleanText(excerpt);
  const titleLower = cleanTitle.toLowerCase();
  const excerptLower = cleanExcerpt.toLowerCase();
  const isExcerptRedundant =
    excerptLower.startsWith(titleLower.substring(0, 30)) ||
    titleLower.startsWith(excerptLower.substring(0, 30)) ||
    cleanExcerpt.length < 20;

  return (
    <article
      className={cn(
        'border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-3 transition hover:bg-[var(--app-surface-raised)]',
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em]">
          <span
            className="inline-flex max-w-full items-center border px-1.5 py-0.5 text-white"
            style={{
              backgroundColor: sourceColor || 'var(--app-subtle)',
              borderColor: sourceColor || 'var(--app-border)',
            }}
          >
            <span className="truncate">{sourceName}</span>
          </span>

          {sectorTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-1.5 py-0.5 text-[var(--app-muted)]"
            >
              {tag}
            </span>
          ))}

          {impactBadge && (
            <span className="inline-flex items-center border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-1.5 py-0.5 text-[var(--app-muted)]">
              {impactBadge.label}
            </span>
          )}

          <span className="ml-auto whitespace-nowrap text-[var(--app-subtle)]">
            {formatArticleDate(date)}
          </span>
        </div>

        <h3 className="text-base font-bold leading-snug text-[var(--app-text)]">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-1.5 hover:text-[var(--app-link)] focus-visible:app-focus"
          >
            <span>{cleanTitle}</span>
            <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0" />
          </a>
        </h3>

        {!isExcerptRedundant && !summary && (
          <p className="text-sm leading-relaxed text-[var(--app-muted)]">
            {truncateText(cleanExcerpt, 170)}
          </p>
        )}

        {summary && (
          <p className="border-l-2 border-[var(--app-border-strong)] bg-[var(--app-bg-soft)] px-3 py-2 text-sm leading-relaxed text-[var(--app-text)]">
            {truncateText(cleanText(summary), 220)}
          </p>
        )}

        {(dateSource || isEstimated) && (
          <p
            className={cn(
              'text-[11px] font-medium',
              isEstimated ? 'text-[var(--app-warning)]' : 'text-[var(--app-subtle)]'
            )}
          >
            {isEstimated
              ? 'Tanggal estimasi distribusi, bukan tanggal rilis presisi.'
              : getNewsDateSourceLabel(dateSource)}
          </p>
        )}
      </div>
    </article>
  );
}
