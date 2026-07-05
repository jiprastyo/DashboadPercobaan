import {
  getBPSHistoricalData,
  getBPSSDGSakernasData,
  getBenchmarkTargets,
} from '@/lib/data-loader-server';
import SDGSakernasClient from './SDGSakernasClient';

export default async function SDGPage() {
  const sdgRes = getBPSSDGSakernasData();
  const historicalRes = getBPSHistoricalData();
  const benchmarkTargets = getBenchmarkTargets();

  return (
    <SDGSakernasClient
      sdgData={sdgRes}
      historicalData={historicalRes ? historicalRes.data : []}
      benchmarkTargets={benchmarkTargets}
    />
  );
}
