import { getSampleOpsData, getSampleMetadata, getSamplePHKData, getSampleNewsData } from '@/lib/data-loader';
import { getNewsData, getPHKArticles } from '@/lib/data-loader-server';
import OperasionalClient from './OperasionalClient';

export default async function OperasionalPage() {
  const opsData = getSampleOpsData();
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
    />
  );
}
