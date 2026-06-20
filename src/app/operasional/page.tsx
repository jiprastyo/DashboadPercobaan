import { getSampleOpsData, getSampleMetadata, getSamplePHKData, getSampleNewsData } from '@/lib/data-loader';
import { getNewsData, getPHKArticles } from '@/lib/data-loader-server';
import OperasionalClient from './OperasionalClient';
import fs from 'fs';
import path from 'path';

function sanitizeOperationalMessage(message: string) {
  return message
    .replace(/Command failed:\s*/gi, '')
    .replace(/python\s+"[^"]+"/gi, 'pengambil data Python')
    .replace(/[A-Za-z]:\\[^\s"]+/g, 'jalur lokal')
    .replace(/\s+/g, ' ')
    .trim();
}

function getOpsData() {
  const opsDir = path.join(process.cwd(), 'data', 'ops');
  if (!fs.existsSync(opsDir)) {
    return getSampleOpsData();
  }

  const latestOpsFile = fs
    .readdirSync(opsDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .at(-1);

  if (!latestOpsFile) {
    return getSampleOpsData();
  }

  try {
    const entries = JSON.parse(fs.readFileSync(path.join(opsDir, latestOpsFile), 'utf-8'));
    if (!Array.isArray(entries)) {
      return getSampleOpsData();
    }

    const scrapers = Object.fromEntries(
      entries.map((entry) => [
        entry.scraper,
        {
          status: entry.status === 'error' ? 'failed' : entry.status,
          latency_ms: entry.latency_ms || 0,
          items_fetched: entry.items_fetched || 0,
          items_new: entry.items_new || 0,
          items_failed: entry.status === 'success' ? 0 : 1,
          http_status: entry.http_status,
          source_url: entry._source_url,
          error_message: Array.isArray(entry.errors) ? sanitizeOperationalMessage(entry.errors.join(' ')) : '',
          last_fetch: entry.finished_at || entry._scraped_at,
        },
      ])
    );

    return [
      {
        run_id: latestOpsFile.replace(/\.json$/, ''),
        timestamp: entries.at(-1)?.finished_at || entries.at(-1)?._scraped_at || new Date().toISOString(),
        tier: 'operasional',
        scrapers,
      },
    ];
  } catch {
    return getSampleOpsData();
  }
}

export default async function OperasionalPage() {
  const opsData = getOpsData();
  const metadata = getSampleMetadata();
  const realNews = getNewsData();
  
  const phkData = getPHKArticles().length > 0 ? getPHKArticles() : getSamplePHKData();
  const newsData = realNews.length > 0 ? realNews : getSampleNewsData();
  const sourceEntries = Object.values(metadata.sources);

  // Calculate statistics on the server side to avoid passing massive JSON to Client
  const sourceCounts: Record<string, number> = {};
  let todayCount = 0;
  const todayStr = new Date().toISOString().split('T')[0];

  newsData.forEach(article => {
    if (article.source) {
      sourceCounts[article.source] = (sourceCounts[article.source] || 0) + 1;
    }
    if (article.date && article.date >= todayStr) {
      todayCount++;
    }
  });

  const stats = {
    totalNews: newsData.length,
    todayNews: todayCount,
    totalPhk: phkData.length,
    sourceCounts
  };

  return (
    <OperasionalClient 
      opsData={opsData} 
      metadata={metadata} 
      sourceEntries={sourceEntries}
      stats={stats}
      buildVersionLabel={new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }).format(new Date())}
    />
  );
}
