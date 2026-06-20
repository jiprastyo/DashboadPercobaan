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
  employmentRatio?: number;
  sparkData?: { value: number }[];
  dataTier: DataTier;
  lastUpdated: string;
  sourceUrl?: string;
  className?: string;
}

import { ResponsiveContainer, LineChart as RechartsLineChart, Line, YAxis } from 'recharts';

export default function CountryCard({
  flagEmoji,
  countryName,
  nsoName,
  nsoUrl,
  unemploymentRate,
  unemploymentPeriod,
  lfpr,
  employmentRatio,
  sparkData,
  dataTier,
  lastUpdated,
  sourceUrl,
  className,
}: CountryCardProps) {
  const tierBadge = getDataTierBadge(dataTier);

  return (
    <div className={cn('rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{flagEmoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--app-text)]">{countryName}</h3>
            <a
              href={nsoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--app-muted)] transition-colors hover:text-[var(--app-link)]"
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
              <span className="text-xs text-[var(--app-muted)]">Pengangguran</span>
              <span className="text-lg font-semibold text-[var(--app-text)]">
                {formatPercent(unemploymentRate)}
              </span>
            </div>
            {unemploymentPeriod && (
              <p className="text-xs text-[var(--app-subtle)]">{unemploymentPeriod}</p>
            )}
          </div>
        )}

        {lfpr !== undefined && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[var(--app-muted)]">TPAK</span>
            <span className="text-sm font-medium text-[var(--app-text)]">
              {formatPercent(lfpr)}
            </span>
          </div>
        )}

        {employmentRatio !== undefined && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[var(--app-muted)]">Rasio Pekerja</span>
            <span className="text-sm font-medium text-[var(--app-text)]">
              {formatPercent(employmentRatio)}
            </span>
          </div>
        )}

        {sparkData && sparkData.length > 0 && (
          <div className="h-10 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={sparkData}>
                <YAxis domain={['auto', 'auto']} hide />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--app-teal)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[var(--app-border)] pt-3">
        <span className="text-xs text-[var(--app-subtle)]">
          Diperbarui: {lastUpdated}
        </span>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[var(--app-link)] hover:underline"
            title="Verifikasi Data Asli"
          >
            Lihat Data ↗
          </a>
        )}
      </div>
    </div>
  );
}
