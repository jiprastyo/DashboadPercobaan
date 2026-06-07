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

  return (
    <OperasionalClient 
      opsData={opsData} 
      metadata={metadata} 
      sourceEntries={sourceEntries}
      newsData={newsData}
      phkData={phkData}
    />
  );
}
