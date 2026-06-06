'use client';

import { getSampleOpsData, getSampleMetadata } from '@/lib/data-loader';
import { formatNumber, formatDate, formatRelativeTime } from '@/lib/utils';
import BarChart from '@/components/charts/BarChart';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, AlertTriangle, XCircle, Cpu, Zap, HardDrive } from 'lucide-react';

export default function OperasionalPage() {
  const opsData = getSampleOpsData();
  const metadata = getSampleMetadata();
  const latestRun = opsData[0];

  // Scraper latency data for bar chart
  const latencyData = Object.entries(latestRun.scrapers)
    .map(([name, data]) => ({
      scraper: name.replace('news_', '').replace('_', ' '),
      'Latensi (ms)': data.latency_ms,
    }))
    .sort((a, b) => b['Latensi (ms)'] - a['Latensi (ms)']);

  // Success rate data
  const scraperEntries = Object.entries(latestRun.scrapers);
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

  return (
    <div className="space-y-6">
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

      {/* Latency Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Latensi per Scraper</h2>
        <p className="text-sm text-gray-500 mb-4">Waktu respons untuk setiap sumber data pada run terakhir.</p>
        <BarChart
          data={latencyData}
          xKey="scraper"
          bars={[{ dataKey: 'Latensi (ms)', label: 'Latensi (ms)', color: '#0D9488' }]}
          layout="vertical"
          height={340}
          barSize={18}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Input: {formatNumber(gemini.total_input_tokens)}</span>
                  <span>Output: {formatNumber(gemini.total_output_tokens)}</span>
                </div>
              </div>
            )}

            {/* Repo Size estimate */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">Ukuran Repo (estimasi)</span>
                </div>
                <span className="text-sm font-medium text-gray-900">~8.2 MB / 1 GB</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-[#3B82F6] h-2 rounded-full transition-all"
                  style={{ width: '0.8%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pro/Kontra Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Catatan Arsitektur</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Aspek</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-emerald-600 uppercase">Pro</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-red-600 uppercase">Kontra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2.5 px-2 font-medium text-gray-700">Static Export</td>
                <td className="py-2.5 px-2 text-gray-600">Cepat, gratis hosting</td>
                <td className="py-2.5 px-2 text-gray-600">Tidak real-time</td>
              </tr>
              <tr>
                <td className="py-2.5 px-2 font-medium text-gray-700">GH Actions Scraper</td>
                <td className="py-2.5 px-2 text-gray-600">Gratis, terjadwal</td>
                <td className="py-2.5 px-2 text-gray-600">Limit 2000 menit/bulan</td>
              </tr>
              <tr>
                <td className="py-2.5 px-2 font-medium text-gray-700">Gemini Flash</td>
                <td className="py-2.5 px-2 text-gray-600">Gratis tier, cepat</td>
                <td className="py-2.5 px-2 text-gray-600">Rate limit ketat</td>
              </tr>
              <tr>
                <td className="py-2.5 px-2 font-medium text-gray-700">JSON Data Store</td>
                <td className="py-2.5 px-2 text-gray-600">Sederhana, no DB</td>
                <td className="py-2.5 px-2 text-gray-600">Skala terbatas</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Log Scraper Terkini</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Scraper</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Latensi</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Diambil</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Baru</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Gagal</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">HTTP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scraperEntries.map(([name, data]) => (
                <tr key={name} className="hover:bg-gray-50">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      {statusIcon(data.status)}
                      <Badge variant={statusBadge(data.status)} size="sm">
                        {data.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-gray-700">{name}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">
                    {formatNumber(data.latency_ms)} ms
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-900 font-medium">{data.items_fetched}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">{data.items_new}</td>
                  <td className={cn(
                    'py-2.5 px-3 text-right font-medium',
                    data.items_failed > 0 ? 'text-red-600' : 'text-gray-400'
                  )}>
                    {data.items_failed}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-500">{data.http_status || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
