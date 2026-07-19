import {
  getBPSHistoricalData,
  getBPSSDGSakernasData,
  getBenchmarkTargets,
  getManualSourceFreshness,
} from '@/lib/data-loader-server';
import SDGSakernasClient from './SDGSakernasClient';

export default async function SDGPage() {
  const sdgRes = getBPSSDGSakernasData();
  const historicalRes = getBPSHistoricalData();
  const benchmarkTargets = getBenchmarkTargets();
  const sdgFreshness = getManualSourceFreshness('bps-sdg-sakernas', sdgRes?._generated_at);

  return (
    <SDGSakernasClient
      sdgData={sdgRes}
      historicalData={historicalRes ? historicalRes.data : []}
      benchmarkTargets={benchmarkTargets}
      sdgFreshness={sdgFreshness}
    />
  );
}
