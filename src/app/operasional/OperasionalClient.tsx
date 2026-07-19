'use client';

import { AlertTriangle, CheckCircle, Clock, Database, ExternalLink, FileText, XCircle } from 'lucide-react';
import EditorialPageShell from '@/components/layout/EditorialPageShell';
import Badge from '@/components/ui/Badge';
import SourceStatusCard from '@/components/cards/SourceStatusCard';
import { NEWS_SOURCES, evaluateFreshness, type HealthStatus } from '@/lib/constants';
import { formatDate, formatNumber, formatRelativeTime } from '@/lib/utils';
import type { OpsLogEntry, ScraperMetadata, DataInventoryEntry } from '@/lib/data-loader-server';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

// Stage 4.3: SourceEntry was a local duplicate of ScraperMetadata + a
// `source` key; now imports the shared type instead of hand-rolling it.
interface SourceEntry extends ScraperMetadata {
  source: string;
}

interface OperasionalClientProps {
  opsData: OpsLogEntry[];
  metadata: {
    lastUpdated?: string;
    scrapers?: Record<string, ScraperMetadata>;
  };
  sourceEntries: SourceEntry[];
  dataInventory: DataInventoryEntry[];
  stats: {
    totalNews: number;
    todayNews: number;
    totalPhk: number;
    sourceCounts: Record<string, number>;
    latestBySource: Record<string, string>;
  };
  buildVersionLabel: string;
}

// STALE_LIMIT_DAYS moved to src/lib/constants.ts (Stage 4.1) -- this is the
// only consumer-side change needed; the badges on public pages read the
// same table via evaluateFreshness().
const SOURCE_URLS: Record<string, string> = {
  'news-aggregator': 'Google News RSS + daftar media lokal',
  'gemini-summarize': 'Gemini API',
  'bps-html': 'https://www.bps.go.id/subject/6/tenaga-kerja.html',
  kemenaker: 'https://kemnaker.go.id/news',
  'google-trends-node': 'https://trends.google.com/trends/',
  'google-trends-py': 'https://trends.google.com/trends/',
  'bps-national': 'https://webapi.bps.go.id/developer/',
  'bps-provinsi': 'https://webapi.bps.go.id/developer/',
  'bi-pmi': 'https://www.bi.go.id/',
  'asean-nso': 'ASEAN national statistics offices',
  'asean-fallback': 'World Bank / ILO modeled series',
};

function isValidDate(value?: string): value is string {
  return Boolean(value && Number.isFinite(new Date(value).getTime()));
}

function daysSince(value?: string): number | null {
  if (!isValidDate(value)) {
    return null;
  }
  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
}

// Kept as a thin local wrapper: daysSince() is still needed for display
// ("Segar, N hari sejak update" appears in the UI text below), but the
// PASS/FAIL judgement itself now comes from the one shared rule.
function safeRelative(value?: string): string {
  return isValidDate(value) ? formatRelativeTime(value) : 'belum tercatat';
}

function safeDate(value?: string): string {
  return isValidDate(value) ? formatDate(value, 'long') : '-';
}

function sanitizeOperationalMessage(message?: string): string {
  if (!message) {
    return '';
  }

  const normalized = message.replace(/\s+/g, ' ').trim();
  if (/python trends script failed/i.test(normalized) || /google-trends-py/i.test(normalized)) {
    return 'Google Trends Python gagal mengambil data.';
  }

  return normalized
    .replace(/Command failed:\s*/gi, '')
    .replace(/\b(?:python|py)\s+"[^"]+"/gi, 'pengambil data Python')
    .replace(/[A-Za-z]:\\[^\s"]+/g, 'jalur lokal')
    .replace(/\s+/g, ' ')
    .trim();
}

function statusVariant(status?: string): BadgeVariant {
  switch ((status || '').toLowerCase()) {
    case 'success':
    case 'ok':
      return 'success';
    case 'partial':
    case 'warning':
      return 'warning';
    case 'failed':
    case 'error':
      return 'danger';
    default:
      return 'default';
  }
}

function statusIcon(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'success':
    case 'ok':
      return <CheckCircle className="h-4 w-4 text-[var(--app-success)]" />;
    case 'partial':
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-[var(--app-warning)]" />;
    case 'failed':
    case 'error':
      return <XCircle className="h-4 w-4 text-[var(--app-danger)]" />;
    default:
      return <Clock className="h-4 w-4 text-[var(--app-subtle)]" />;
  }
}

function sourceLabel(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Stage 4.4: freshnessFor() is now a thin wrapper around the ONE shared
// rule (evaluateFreshness in src/lib/constants.ts) -- no second
// implementation. The "Yang perlu dicek" panel and every public-page badge
// derive their ok/warning/error from this same function.
function freshnessFor(source: string, lastFetch?: string, status?: string): { status: HealthStatus; reason: string } {
  return evaluateFreshness({ source, lastStatus: status, ageDays: daysSince(lastFetch) });
}

export default function OperasionalClient({
  opsData,
  metadata,
  sourceEntries,
  dataInventory,
  stats,
  buildVersionLabel,
}: OperasionalClientProps) {
  const latestRunAt = opsData[0]?.finished_at || opsData[0]?._scraped_at || metadata.lastUpdated;
  const latestOps = sourceEntries
    .filter((source) => source.source.toLowerCase() !== 'setkab')
    .map((source) => {
      const matchingOps = opsData.find((entry) => entry.scraper === source.source);
      const lastFetch = matchingOps?.finished_at || matchingOps?._scraped_at || source.lastFetch;
      const status = matchingOps?.status || source.lastStatus || 'unknown';
      const freshness = freshnessFor(source.source, lastFetch, status);

      return {
        name: source.source,
        status,
        lastFetch,
        latency: matchingOps?.latency_ms ?? source.lastLatencyMs,
        items: matchingOps?.items_fetched ?? source.lastItemsFetched ?? 0,
        itemsNew: matchingOps?.items_new ?? 0,
        errors: matchingOps?.errors || [],
        sourceUrl: SOURCE_URLS[source.source] || matchingOps?._source_url || 'Metadata lokal',
        health: freshness.status,
        reason: sanitizeOperationalMessage(matchingOps?.errors?.[0]) || freshness.reason,
      };
    })
    .sort((left, right) => {
      const severity = { error: 0, warning: 1, ok: 2 };
      return severity[left.health] - severity[right.health];
    });

  const failedOps = latestOps.filter((entry) => entry.health === 'error').length;
  const warningOps = latestOps.filter((entry) => entry.health === 'warning').length;
  const warningFiles = dataInventory.filter((entry) => entry.status !== 'ok').length;
  const totalFetched = latestOps.reduce((sum, entry) => sum + entry.items, 0);
  const totalNew = latestOps.reduce((sum, entry) => sum + entry.itemsNew, 0);
  const overallStatus: HealthStatus = failedOps > 0 ? 'error' : warningOps + warningFiles > 0 ? 'warning' : 'ok';

  const newsSourcesTable = NEWS_SOURCES.map((source) => ({
    ...source,
    articleCount: stats.sourceCounts[source.id] || 0,
    lastArticle: stats.latestBySource[source.id],
  })).sort((left, right) => {
    const leftDate = new Date(left.lastArticle || 0).getTime();
    const rightDate = new Date(right.lastArticle || 0).getTime();
    return rightDate - leftDate || right.articleCount - left.articleCount;
  });

  const attentionItems = [
    ...latestOps
      .filter((entry) => entry.health !== 'ok')
      .map((entry) => `${sourceLabel(entry.name)}: ${entry.reason}`),
    ...dataInventory
      .filter((entry) => entry.status !== 'ok')
      .map((entry) => `${entry.label}: ${entry.note}`),
  ].slice(0, 6);

  return (
    <EditorialPageShell
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Pembaruan scraper" value={safeRelative(latestRunAt)} detail={safeDate(latestRunAt)} />
          <MetricCard label="Scraper dipantau" value={formatNumber(latestOps.length)} detail={`${failedOps} gagal, ${warningOps} perlu cek`} />
          <MetricCard label="Berita" value={formatNumber(stats.totalNews)} detail={`${formatNumber(stats.todayNews)} artikel hari ini`} />
          <MetricCard label="Item run terbaru" value={formatNumber(totalFetched)} detail={`${formatNumber(totalNew)} item baru`} />
        </section>

        {attentionItems.length > 0 && (
          <section className="border border-[color:color-mix(in_srgb,var(--app-warning)_35%,var(--app-border))] bg-[color:color-mix(in_srgb,var(--app-warning)_12%,var(--app-surface))] p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--app-warning)]" />
              <h2 className="text-sm font-semibold text-[var(--app-warning)]">Yang perlu dicek</h2>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {attentionItems.map((item) => (
                <p key={item} className="text-xs leading-5 text-[var(--app-warning)]">{item}</p>
              ))}
            </div>
          </section>
        )}

        <section className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--app-text)]">Ringkasan per scraper</h2>
            <span className="text-xs text-[var(--app-subtle)]">(status per build terakhir)</span>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
            {latestOps.map((entry) => (
              <SourceStatusCard
                key={entry.name}
                source={{
                  name: sourceLabel(entry.name),
                  health: entry.health,
                  lastFetch: entry.lastFetch,
                  items: entry.items,
                  reason: entry.reason,
                }}
              />
            ))}
          </div>
        </section>

        <section className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--app-text)]">Last run per scraper dan sumber data</h2>
              <p className="mt-1 text-xs text-[var(--app-muted)]">Dibaca dari `data/_metadata.json` dan `data/ops/*.json`; sumber yang sudah dinonaktifkan disembunyikan dari monitor aktif. Status per build terakhir -- rebuild berikutnya dipicu oleh commit scraper lain, sehingga sumber yang mati akan tetap terlihat semakin basi pada build-build berikutnya.</p>
            </div>
            <Badge variant={statusVariant(overallStatus)}>{overallStatus}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)]">
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Scraper</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Status</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Last run</th>
                  <th className="px-3 py-2 text-right text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Item</th>
                  <th className="px-3 py-2 text-right text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Latensi</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Sumber data</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {latestOps.map((entry) => (
                  <tr key={entry.name} className="hover:bg-[var(--app-bg-soft)]">
                    <td className="px-3 py-2.5 font-medium text-[var(--app-text)]">{sourceLabel(entry.name)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {statusIcon(entry.health)}
                        <Badge variant={statusVariant(entry.status)} size="sm">{entry.status}</Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--app-muted)]">
                      <div>{safeRelative(entry.lastFetch)}</div>
                      <div className="text-xs text-[var(--app-subtle)]">{safeDate(entry.lastFetch)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[var(--app-text)]">{formatNumber(entry.items)}</td>
                    <td className="px-3 py-2.5 text-right text-[var(--app-muted)]">
                      {entry.latency ? `${formatNumber(entry.latency)} ms` : '-'}
                    </td>
                    <td className="max-w-[260px] px-3 py-2.5 text-[var(--app-muted)]">{entry.sourceUrl}</td>
                    <td className="max-w-[280px] px-3 py-2.5 text-xs leading-5 text-[var(--app-muted)]">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-[var(--app-muted)]" />
              <h2 className="text-base font-semibold text-[var(--app-text)]">Inventory file data</h2>
            </div>
            <div className="divide-y divide-[var(--app-border)]">
              {dataInventory.map((entry) => (
                <div key={entry.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-[var(--app-text)]">{entry.label}</div>
                      <div className="mt-1 text-xs text-[var(--app-subtle)]">{entry.path}</div>
                    </div>
                    <Badge variant={statusVariant(entry.status)}>{entry.status}</Badge>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-[var(--app-muted)] sm:grid-cols-3">
                    <span>{formatNumber(entry.records)} record</span>
                    <span>{safeRelative(entry.lastUpdated)}</span>
                    <span>{entry.source}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--app-subtle)]">{entry.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--app-muted)]" />
              <h2 className="text-base font-semibold text-[var(--app-text)]">Situs berita terpantau</h2>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--app-surface)]">
                  <tr className="border-b border-[var(--app-border)]">
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Situs</th>
                    <th className="px-3 py-2 text-right text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Artikel</th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">Artikel terbaru</th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--app-border)]">
                  {newsSourcesTable.map((source) => (
                    <tr key={source.id} className="hover:bg-[var(--app-bg-soft)]">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                          <span className="font-medium text-[var(--app-text)]">{source.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[var(--app-text)]">{formatNumber(source.articleCount)}</td>
                      <td className="px-3 py-2.5 text-[var(--app-muted)]">{safeRelative(source.lastArticle)}</td>
                      <td className="px-3 py-2.5">
                        <a className="inline-flex items-center gap-1 text-xs text-[var(--app-teal)] hover:underline" href={source.url} target="_blank" rel="noreferrer">
                          sumber <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </EditorialPageShell>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <p className="text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">{value}</p>
      <p className="mt-0.5 text-xs text-[var(--app-subtle)]">{detail}</p>
    </div>
  );
}
