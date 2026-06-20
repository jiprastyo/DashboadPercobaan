import { Check, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { getNewsDateSourceLabel } from '@/lib/news-archive';
import { cn } from '@/lib/utils';
import CompactChip from '@/components/ui/CompactChip';

interface NewsTagItem {
  id: string;
  label: string;
  onClick?: () => void;
}

interface NewsCardProps {
  title: string;
  date: string;
  sourceName: string;
  sourceOnClick?: () => void;
  tags?: NewsTagItem[];
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
  sourceOnClick,
  tags = [],
  url,
  isEstimated,
  dateSource,
  className,
}: NewsCardProps) {
  const cleanTitle = cleanText(title);
  const showVerifiedDateSource = !isEstimated && (dateSource === 'original_feed' || dateSource === 'article_metadata');
  const showEstimatedDateSource = Boolean(isEstimated);
  const dateSourceLabel = dateSource ? getNewsDateSourceLabel(dateSource) : '';

  return (
    <article
      className={cn(
        'border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-3 transition hover:bg-[var(--app-surface-raised)] md:grid md:grid-cols-[160px_minmax(0,1fr)] md:gap-2',
        className
      )}
    >
      <div className="space-y-1 text-xs text-[var(--app-subtle)]">
        {sourceOnClick ? (
          <button
            type="button"
            onClick={sourceOnClick}
            className="text-left font-medium text-[var(--app-text)] hover:text-[var(--app-link)] hover:underline focus-visible:app-focus"
          >
            {sourceName}
          </button>
        ) : (
          <div className="font-medium text-[var(--app-text)]">{sourceName}</div>
        )}
        <div className="flex items-center gap-1.5">
          <span>{formatArticleDate(date)}</span>
          {showVerifiedDateSource ? (
            <div className="group relative inline-flex">
              <button
                type="button"
                aria-label={dateSourceLabel}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white focus-visible:app-focus"
              >
                <Check className="h-3 w-3" />
              </button>
              <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-48 border border-emerald-200 bg-white px-2 py-1.5 text-[11px] font-medium text-emerald-800 shadow-lg group-hover:block group-focus-within:block dark:bg-[var(--app-surface)]">
                {dateSourceLabel}
              </div>
            </div>
          ) : null}
          {showEstimatedDateSource ? (
            <div className="group relative inline-flex">
              <button
                type="button"
                aria-label="Tanggal estimasi distribusi, bukan tanggal rilis presisi."
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--app-warning)] text-white focus-visible:app-focus"
              >
                <span className="text-[10px] font-bold leading-none">!</span>
              </button>
              <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-56 border border-amber-200 bg-white px-2 py-1.5 text-[11px] font-medium text-amber-800 shadow-lg group-hover:block group-focus-within:block dark:bg-[var(--app-surface)]">
                Tanggal estimasi distribusi, bukan tanggal rilis presisi.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <h3 className="text-sm font-semibold leading-snug text-[var(--app-text)]">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-1 hover:text-[var(--app-link)] focus-visible:app-focus"
          >
            <span>{cleanTitle}</span>
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          </a>
        </h3>

        {tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.06em]">
            {tags.map((tag) =>
              tag.onClick ? (
                <CompactChip key={tag.id} onClick={tag.onClick}>
                  {tag.label}
                </CompactChip>
              ) : (
                <CompactChip key={tag.id}>
                  {tag.label}
                </CompactChip>
              )
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
