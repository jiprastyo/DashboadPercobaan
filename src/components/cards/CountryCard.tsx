import Badge from '@/components/ui/Badge';
import { cn, formatPercent, getDataTierBadge } from '@/lib/utils';
import type { DataTier } from '@/types';

interface CountryCardProps {
  flagEmoji: string;
  countryName: string;
  nsoName: string;
  nsoUrl: string;
  unemploymentRate?: number;
  unemploymentPeriod?: string;
  lfpr?: number;
  dataTier: DataTier;
  lastUpdated: string;
  className?: string;
}

export default function CountryCard({
  flagEmoji,
  countryName,
  nsoName,
  nsoUrl,
  unemploymentRate,
  unemploymentPeriod,
  lfpr,
  dataTier,
  lastUpdated,
  className,
}: CountryCardProps) {
  const tierBadge = getDataTierBadge(dataTier);

  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{flagEmoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{countryName}</h3>
            <a
              href={nsoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-[#0D9488] transition-colors"
            >
              {nsoName}
            </a>
          </div>
        </div>
        <Badge className={tierBadge.className} size="sm">
          {tierBadge.label}
        </Badge>
      </div>

      <div className="space-y-2">
        {unemploymentRate !== undefined && (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-500">Pengangguran</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatPercent(unemploymentRate)}
              </span>
            </div>
            {unemploymentPeriod && (
              <p className="text-xs text-gray-400">{unemploymentPeriod}</p>
            )}
          </div>
        )}

        {lfpr !== undefined && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500">TPAK</span>
            <span className="text-sm font-medium text-gray-700">
              {formatPercent(lfpr)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          Diperbarui: {lastUpdated}
        </span>
      </div>
    </div>
  );
}
