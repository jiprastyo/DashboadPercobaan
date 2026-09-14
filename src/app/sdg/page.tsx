import {
  getBPSHistoricalData,
  getBPSSDGSakernasData,
  getBenchmarkTargets,
  getManualSourceFreshness,
} from '@/lib/data-loader-server';
import SDGSakernasClient from './SDGSakernasClient';

export const metadata = {
  title: 'Indikator SDG Ketenagakerjaan',
  description:
    'Indikator SDG 8 ketenagakerjaan dari BPS Web API dengan benchmark Sakernas dan target RPJMN.',
};

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
