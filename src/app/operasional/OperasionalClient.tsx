'use client';

import { Clock, CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';
import SourceStatusCard from '@/components/cards/SourceStatusCard';
import EditorialPageShell from '@/components/layout/EditorialPageShell';
import Badge from '@/components/ui/Badge';
import { NEWS_SOURCES } from '@/lib/constants';
import { formatDate, formatNumber, formatRelativeTime } from '@/lib/utils';

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
  buildVersionLabel: string;
}

export default function OperasionalClient({
  opsData,
  metadata,
  sourceEntries,
  stats,
  buildVersionLabel,
}: OperasionalClientProps) {
  const latestRun = opsData[0];

  const sourceCounts = stats.sourceCounts;
  const scraperEntries = Object.entries(latestRun.scrapers) as [string, any][];
  const totalItems = scraperEntries.reduce((sum, [, data]) => sum + data.items_fetched, 0);
  const totalFailed = scraperEntries.reduce((sum, [, data]) => sum + data.items_failed, 0);
  const successRate = totalItems > 0 ? ((totalItems - totalFailed) / totalItems) * 100 : 100;

  const now = new Date();
  const latencyThresholdMs = 5000;
  const staleThresholdDays = 10;

  const sanitizeOperationalMessage = (message: string) => {
    return message
      .replace(/Command failed:\s*/gi, '')
      .replace(/python\s+"[^"]+"/gi, 'pengambil data Python')
      .replace(/[A-Za-z]:\\[^\s"]+/g, 'jalur lokal')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-[var(--app-subtle)]" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return 'success' as const;
      case 'partial':
        return 'warning' as const;
      case 'failed':
        return 'danger' as const;
      default:
        return 'default' as const;
    }
  };

  const newsSourcesTable = NEWS_SOURCES.map((source) => {
    const scraperLogKey = scraperEntries.find(([key]) => key === source.id || key === `news_${source.id}`)?.[0];
    const scraperLog = scraperLogKey ? latestRun.scrapers[scraperLogKey] : latestRun.scrapers['news-aggregator'];
    const lastFetch = scraperLog?.last_fetch || latestRun.timestamp;
    const staleDays = lastFetch ? Math.floor((now.getTime() - new Date(lastFetch).getTime()) / 86400000) : null;
    const latency = Number(scraperLog?.latency_ms || 0);
    const status = scraperLog?.status || 'unknown';
    const issues = [
      status === 'failed' || status === 'partial' ? status : null,
      latency > latencyThresholdMs ? 'lambat' : null,
      staleDays !== null && staleDays > staleThresholdDays ? 'stale' : null,
    ].filter(Boolean) as string[];

    return {
      ...source,
      articleCount: sourceCounts[source.id] || 0,
      latency: latency || null,
      status,
      http_status: scraperLog?.http_status || '-',
      lastFetch,
      issues,
    };
  }).sort((left, right) => right.articleCount - left.articleCount);
  const operationalIssues = scraperEntries.flatMap(([key, data]) => {
    const latency = Number(data.latency_ms || 0);
    const status = data.status || 'unknown';
    const messages: string[] = [];

    if (status === 'failed' || status === 'partial') {
      messages.push(`${key}: ${status === 'failed' ? 'gagal' : 'parsial'}`);
    }
    if (latency > latencyThresholdMs) {
      messages.push(`${key}: latensi ${formatNumber(latency)} ms`);
    }
    if (data.error_message) {
      messages.push(`${key}: ${sanitizeOperationalMessage(data.error_message)}`);
    }

    return messages;
  });
  const issueCount = operationalIssues.length + newsSourcesTable.filter((source) => source.issues.length > 0).length;

  return (
    <EditorialPageShell
      eyebrow="Operasional"
      title="Status sumber data dan scraper"
      description="Lembar kontrol untuk membaca kesehatan aliran data, jejak workflow, dan distribusi artikel per sumber."
      summary={
        <div className="space-y-2">
          <div className="text-lg font-semibold text-[var(--app-text)]">{formatRelativeTime(latestRun.timestamp)}</div>
          <p className="text-xs leading-5 text-[var(--app-muted)]">
            Success rate {formatNumber(successRate, 1)}% dengan {scraperEntries.length} scraper aktif. Build: {buildVersionLabel}
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <p className="text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Pembaruan scraper</p>
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
            <p className="text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Isu aktif</p>
            <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">{formatNumber(issueCount)}</p>
            <p className="mt-0.5 text-xs text-[var(--app-subtle)]">gagal, stale, parsial, atau lambat</p>
          </div>
        </section>

        <section className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
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
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {newsSourcesTable.map((source) => (
                  <tr key={source.id} className="hover:bg-[var(--app-bg-soft)]">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: source.color }}></span>
                        <span className="font-medium text-[var(--app-text)]">{source.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {statusIcon(source.status)}
                        <Badge variant={statusBadge(source.status)} size="sm">
                          {source.status === 'unknown' ? 'idle' : source.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-[var(--app-text)]">
                      {formatNumber(source.articleCount)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[var(--app-muted)]">
                      {source.latency ? `${formatNumber(source.latency)} ms` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[var(--app-subtle)]">{source.http_status}</td>
                    <td className="px-3 py-2.5 text-xs text-[var(--app-muted)]">
                      {source.issues.length > 0 ? source.issues.join(', ') : 'terpantau'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Status sumber data API</h2>
            <div className="divide-y divide-[var(--app-border)]">
              {sourceEntries
                .filter((source) => source.source !== 'Setkab' && !source.source.includes('News'))
                .map((source) => (
                  <SourceStatusCard key={source.source} source={source} />
                ))}
            </div>
          </div>

          <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Catatan sumber</h2>
            <div className="space-y-3">
              {sourceEntries.map((source) => (
                <div key={source.source} className="border-b border-[var(--app-border)] pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-[var(--app-text)]">{source.source}</span>
                    <span className="text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">
                      {source.status} - {formatNumber(source.items_total)} item
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--app-muted)]">
                    terakhir berhasil {formatDate(source.last_success, 'long')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
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

          <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[var(--app-text)]">
              <Activity className="h-4 w-4 text-[var(--app-subtle)]" />
              Isu latensi dan status
            </h2>
            <div className="space-y-2 text-sm">
              {operationalIssues.length > 0 ? (
                operationalIssues.slice(0, 12).map((issue) => (
                  <div key={issue} className="border-b border-[var(--app-border)] pb-2 text-[var(--app-muted)] last:border-b-0">
                    {issue}
                  </div>
                ))
              ) : (
                <p className="text-[var(--app-muted)]">Tidak ada isu operasional utama pada artefak terakhir.</p>
              )}
              <p className="pt-2 text-xs text-[var(--app-subtle)]">Build: {buildVersionLabel}</p>
            </div>
          </div>
        </section>
      </div>
    </EditorialPageShell>
  );
}
