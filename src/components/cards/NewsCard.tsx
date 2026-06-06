import Badge from '@/components/ui/Badge';
import { cn, formatRelativeTime, truncateText } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

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
  className?: string;
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
  className,
}: NewsCardProps) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg p-5', className)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-block px-2 py-0.5 text-xs font-medium rounded-full text-white"
            style={{ backgroundColor: sourceColor || '#6B7280' }}
          >
            {sourceName}
          </span>
          {impactBadge && (
            <span className={cn('inline-block px-2 py-0.5 text-xs font-medium rounded-full border', impactBadge.className)}>
              {impactBadge.emoji} {impactBadge.label}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
          {formatRelativeTime(date)}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mb-2 leading-snug">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#0D9488] transition-colors"
        >
          {title}
          <ExternalLink className="inline w-3 h-3 ml-1 opacity-0 group-hover:opacity-100" />
        </a>
      </h3>

      {summary ? (
        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
          {truncateText(summary, 200)}
        </p>
      ) : (
        <p className="text-sm text-gray-500 mb-3 leading-relaxed">
          {truncateText(excerpt, 180)}
        </p>
      )}

      {sectorTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {sectorTags.map((tag) => (
            <Badge key={tag} variant="default" size="sm">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
