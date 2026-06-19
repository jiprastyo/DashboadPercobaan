import { getSamplePHKData, getSampleNewsData } from '@/lib/data-loader';
import { getDashboardMetadata, getDataInventory, getNewsData, getOpsRuns, getPHKArticles } from '@/lib/data-loader-server';
import OperasionalClient from './OperasionalClient';

export default async function OperasionalPage() {
  const opsData = getOpsRuns();
  const metadata = getDashboardMetadata();
  const dataInventory = getDataInventory();
  const realNews = getNewsData();
  
  const phkData = getPHKArticles().length > 0 ? getPHKArticles() : getSamplePHKData();
  const newsData = realNews.length > 0 ? realNews : getSampleNewsData();
  const sourceEntries = Object.entries(metadata.scrapers || {})
    .filter(([source]) => source.toLowerCase() !== 'setkab')
    .map(([source, data]) => ({
      source,
      ...data,
    }));

  // Calculate statistics on the server side to avoid passing massive JSON to Client
  const sourceCounts: Record<string, number> = {};
  const latestBySource: Record<string, string> = {};
  let todayCount = 0;
  const todayStr = new Date().toISOString().split('T')[0];

  newsData.forEach(article => {
    if (article.source) {
      sourceCounts[article.source] = (sourceCounts[article.source] || 0) + 1;
      const articleTime = article.date ? new Date(article.date).getTime() : NaN;
      if (Number.isFinite(articleTime) && (!latestBySource[article.source] || articleTime > new Date(latestBySource[article.source]).getTime())) {
        latestBySource[article.source] = article.date;
      }
    }
    if (article.date && article.date >= todayStr) {
      todayCount++;
    }
  });

  const stats = {
    totalNews: newsData.length,
    todayNews: todayCount,
    totalPhk: phkData.length,
    sourceCounts,
    latestBySource
  };

  return (
    <OperasionalClient 
      opsData={opsData} 
      metadata={{ lastUpdated: metadata.lastUpdated }} 
      sourceEntries={sourceEntries}
      dataInventory={dataInventory}
      stats={stats}
    />
  );
}
