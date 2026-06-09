'use client';

import { formatNumber, formatRelativeTime } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import SourceStatusCard from '@/components/cards/SourceStatusCard';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, AlertTriangle, XCircle, Cpu, Zap, HardDrive } from 'lucide-react';
import { NEWS_SOURCES } from '@/lib/constants';

interface OperasionalClientProps {
  opsData: any;
  metadata: any;
  sourceEntries: any[];
  stats: {
    totalNews: number;
    todayNews: number;
    totalPhk: number;
    sourceCounts: Record<string, number>;
  };
}

export default function OperasionalClient({ 
  opsData, 
  metadata, 
  sourceEntries, 
  stats 
}: OperasionalClientProps) {
  const latestRun = opsData[0];

  // Calculate article counts per source dynamically from server stats
  const sourceCounts = stats.sourceCounts;

  // Success rate data from scraper run logs
  const scraperEntries = Object.entries(latestRun.scrapers) as [string, any][];
  const totalItems = scraperEntries.reduce((sum, [, d]) => sum + d.items_fetched, 0);
  const totalFailed = scraperEntries.reduce((sum, [, d]) => sum + d.items_failed, 0);
  const successRate = totalItems > 0 ? ((totalItems - totalFailed) / totalItems) * 100 : 100;

  // Resource usage
  const gemini = latestRun.gemini;
  const ghActions = latestRun.github_actions;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'partial': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'success': return 'success' as const;
      case 'partial': return 'warning' as const;
      case 'failed': return 'danger' as const;
      default: return 'default' as const;
    }
  };

  // Combine News Sources with their article counts and latency from scraper logs
  const newsSourcesTable = NEWS_SOURCES.map(source => {
    // Attempt to find the scraper log for this source
    // Scraper keys might be 'news_kontan', 'kontan', etc. Let's check both
    const scraperLogKey = scraperEntries.find(([key]) => key === source.id || key === `news_${source.id}`)?.[0];
    const scraperLog = scraperLogKey ? latestRun.scrapers[scraperLogKey] : null;
    
    return {
      ...source,
      articleCount: sourceCounts[source.id] || 0,
      latency: scraperLog?.latency_ms || '-',
      status: scraperLog?.status || 'unknown',
      http_status: scraperLog?.http_status || '-'
    };
  }).sort((a, b) => b.articleCount - a.articleCount);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Run Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Run terakhir</p>
              <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">{formatRelativeTime(latestRun.timestamp)}</p>
              <p className="mt-0.5 text-xs text-[var(--app-subtle)]">{latestRun.run_id}</p>
            </div>
            <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Success rate</p>
              <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">{formatNumber(successRate, 1)}%</p>
              <p className="mt-0.5 text-xs text-[var(--app-subtle)]">{totalItems - totalFailed}/{totalItems} item</p>
            </div>
            <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Tier</p>
              <p className="mt-1 text-lg font-semibold capitalize text-[var(--app-text)]">{latestRun.tier}</p>
              <p className="mt-0.5 text-xs text-[var(--app-subtle)]">{scraperEntries.length} scraper aktif</p>
            </div>
            <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Durasi workflow</p>
              <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">
                {ghActions ? `${formatNumber(ghActions.run_duration_ms / 1000, 0)}s` : '-'}
              </p>
              <p className="mt-0.5 text-xs text-[var(--app-subtle)]">{ghActions?.billable_minutes || 0} menit terbillable</p>
            </div>
          </div>

          {/* All News Sources Summary Table */}
          <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <h2 className="mb-4 text-base font-semibold text-[var(--app-text)]">Statistik sumber berita</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--app-border)]">
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Sumber</th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Status</th>
                    <th className="px-3 py-2 text-right text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Total artikel</th>
                    <th className="px-3 py-2 text-right text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Latensi</th>
                    <th className="px-3 py-2 text-right text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">HTTP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--app-border)]">
                  {newsSourcesTable.map((source) => (
                    <tr key={source.id} className="hover:bg-[var(--app-bg-soft)]">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: source.color }}></span>
                          <span className="font-medium text-[var(--app-text)]">{source.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {statusIcon(source.status)}
                          <Badge variant={statusBadge(source.status)} size="sm">
                            {source.status === 'unknown' ? 'idle' : source.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-[var(--app-text)]">
                        {formatNumber(source.articleCount)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[var(--app-muted)]">
                        {source.latency !== '-' ? `${formatNumber(source.latency)} ms` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[var(--app-subtle)]">
                        {source.http_status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-4">
          <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Status sumber data API</h2>
            <div className="divide-y divide-[var(--app-border)]">
              {sourceEntries.filter(s => s.source !== 'Setkab' && !s.source.includes('News')).map((source) => (
                <SourceStatusCard key={source.source} source={source} />
              ))}
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Ringkasan cepat</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--app-muted)]">Total berita keseluruhan</span>
                <span className="font-medium text-[var(--app-text)]">{stats.totalNews}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--app-muted)]">Berita hari ini</span>
                <span className="font-medium text-[var(--app-text)]">{stats.todayNews}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--app-muted)]">Laporan PHK terdeteksi</span>
                <span className="font-medium text-[var(--app-text)]">{stats.totalPhk}</span>
              </div>
            </div>
          </div>
          
          {/* Resource Usage */}
          <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <h2 className="mb-4 text-base font-semibold text-[var(--app-text)]">Penggunaan resource</h2>
            <div className="space-y-4">
              {/* GH Actions Minutes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-[var(--app-muted)]">GitHub Actions</span>
                  </div>
                  <span className="text-sm font-medium text-[var(--app-text)]">
                    {ghActions?.billable_minutes || 0} / 2.000 menit
                  </span>
                </div>
                <div className="h-2 w-full bg-[var(--app-bg-soft)]">
                  <div
                    className="h-2 bg-[var(--app-teal)] transition-all"
                    style={{ width: `${Math.min(100, ((ghActions?.billable_minutes || 0) / 2000) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Gemini Tokens */}
              {gemini && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-[var(--app-muted)]">Gemini token</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--app-text)]">
                      {formatNumber(gemini.total_input_tokens + gemini.total_output_tokens)} total
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[var(--app-bg-soft)]">
                    <div
                      className="h-2 bg-[var(--app-warning)] transition-all"
                      style={{ width: `${Math.min(100, ((gemini.total_input_tokens + gemini.total_output_tokens) / 1000000) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
