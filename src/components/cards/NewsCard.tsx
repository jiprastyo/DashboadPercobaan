import Badge from '@/components/ui/Badge';
import { cn, truncateText } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

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
  className,
}: NewsCardProps) {
  const cleanTitle = cleanText(title);
  const cleanExcerpt = cleanText(excerpt);
  
  // Check if excerpt is practically the same as the title (starts with title, or very similar)
  // Google News often does "Title - Source ... excerpt"
  const titleLower = cleanTitle.toLowerCase();
  const excerptLower = cleanExcerpt.toLowerCase();
  
  // Excerpt is considered redundant if it starts with the title, or if the title starts with the excerpt
  const isExcerptRedundant = 
    excerptLower.startsWith(titleLower.substring(0, 30)) || 
    titleLower.startsWith(excerptLower.substring(0, 30)) ||
    cleanExcerpt.length < 20;

  return (
    <div className={cn('bg-white border-b-2 border-gray-900 py-3 hover:bg-gray-50 transition-colors', className)}>
      <div className="flex flex-col gap-1">
        
        {/* Top compact row: Source, Tags, Title, Date */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded-sm text-white tracking-wide uppercase"
            style={{ backgroundColor: sourceColor || '#6B7280' }}
          >
            {sourceName}
          </span>
          
          {sectorTags.map((tag) => (
            <span key={tag} className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded-none bg-gray-900 text-white uppercase tracking-wide">
              {tag}
            </span>
          ))}
          
          {impactBadge && (
            <span className={cn('inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-sm border', impactBadge.className)}>
              {impactBadge.emoji} {impactBadge.label}
            </span>
          )}

          <h3 className="text-sm font-bold text-gray-900 inline tracking-tight">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors"
            >
              {cleanTitle}
            </a>
          </h3>
          
          <div className="flex flex-col items-end ml-auto">
            <span className="text-[11px] text-gray-400 whitespace-nowrap">
              {(() => {
                try {
                  const parsed = parseISO(date);
                  if (!isNaN(parsed.getTime())) {
                    return format(parsed, "dd MMM yyyy", { locale: id });
                  }
                } catch(e) {}
                return date;
              })()}
            </span>
            {isEstimated && (
              <span className="text-[9px] text-amber-500 bg-amber-50 px-1 py-0.5 rounded border border-amber-100 mt-0.5" title="Tanggal ini adalah estimasi distribusi (bukan tanggal rilis presisi)">
                Estimasi Waktu
              </span>
            )}
          </div>
        </div>

        {/* Excerpt (only if not redundant) */}
        {!isExcerptRedundant && !summary && (
          <p className="text-[13px] text-gray-500 leading-snug">
            {truncateText(cleanExcerpt, 160)}
          </p>
        )}
        
        {/* Summary (if exists) */}
        {summary && (
          <p className="text-[13px] text-gray-800 font-medium leading-snug bg-gray-100 p-2 rounded-none border-l-4 border-gray-900 mt-1">
            {truncateText(cleanText(summary), 200)}
          </p>
        )}
        
      </div>
    </div>
  );
}
