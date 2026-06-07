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
  newsData: any[];
  phkData: any[];
}

export default function OperasionalClient({ 
  opsData, 
  metadata, 
  sourceEntries, 
  newsData, 
  phkData 
}: OperasionalClientProps) {
  const latestRun = opsData[0];

  // Calculate article counts per source dynamically from newsData
  const sourceCounts: Record<string, number> = {};
  newsData.forEach(article => {
    if (article.source) {
      sourceCounts[article.source] = (sourceCounts[article.source] || 0) + 1;
    }
  });

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
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-xs text-gray-500 uppercase font-medium">Run Terakhir</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatRelativeTime(latestRun.timestamp)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{latestRun.run_id}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-xs text-gray-500 uppercase font-medium">Success Rate</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatNumber(successRate, 1)}%</p>
              <p className="text-xs text-gray-400 mt-0.5">{totalItems - totalFailed}/{totalItems} item</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-xs text-gray-500 uppercase font-medium">Tier</p>
              <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">{latestRun.tier}</p>
              <p className="text-xs text-gray-400 mt-0.5">{scraperEntries.length} scraper aktif</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-xs text-gray-500 uppercase font-medium">Durasi Workflow</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {ghActions ? `${formatNumber(ghActions.run_duration_ms / 1000, 0)}s` : '-'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{ghActions?.billable_minutes || 0} menit terbillable</p>
            </div>
          </div>

          {/* All News Sources Summary Table */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Statistik Sumber Berita</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Sumber</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Total Artikel</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Latensi</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">HTTP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {newsSourcesTable.map((source) => (
                    <tr key={source.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: source.color }}></span>
                          <span className="font-medium text-gray-700">{source.name}</span>
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
                      <td className="py-2.5 px-3 text-right text-gray-900 font-medium">
                        {formatNumber(source.articleCount)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-600">
                        {source.latency !== '-' ? `${formatNumber(source.latency)} ms` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-500">
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
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Status Sumber Data API</h2>
            <div className="divide-y divide-gray-50">
              {sourceEntries.filter(s => s.source !== 'Setkab' && !s.source.includes('News')).map((source) => (
                <SourceStatusCard key={source.source} source={source} />
              ))}
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Ringkasan Cepat</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Berita Keseluruhan</span>
                <span className="font-medium text-gray-900">{newsData.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Berita Hari Ini</span>
                <span className="font-medium text-gray-900">{newsData.filter((n) => n.date >= new Date().toISOString().split('T')[0]).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Laporan PHK Terdeteksi</span>
                <span className="font-medium text-gray-900">{phkData.length}</span>
              </div>
            </div>
          </div>
          
          {/* Resource Usage */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Penggunaan Resource</h2>
            <div className="space-y-4">
              {/* GH Actions Minutes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">GitHub Actions</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {ghActions?.billable_minutes || 0} / 2.000 menit
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-[#0D9488] h-2 rounded-full transition-all"
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
                      <span className="text-sm text-gray-700">Gemini Token</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatNumber(gemini.total_input_tokens + gemini.total_output_tokens)} total
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-[#F59E0B] h-2 rounded-full transition-all"
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
