import {
  getBPSHistoricalData,
  getBPSSDGSakernasData,
  getBPSTptHistoricalData,
  getBPSProvinsiHistoricalData,
} from '@/lib/data-loader-server';
import SDGSakernasClient from './SDGSakernasClient';

export default async function SDGSakernasPage() {
  const sdgRes = getBPSSDGSakernasData();
  const historicalRes = getBPSHistoricalData();
  const tptTimelineRes = getBPSTptHistoricalData();
  const provinceTptRes = getBPSProvinsiHistoricalData();

  return (
    <SDGSakernasClient
      sdgData={sdgRes}
      historicalData={historicalRes ? historicalRes.data : []}
      tptTimelineData={tptTimelineRes ? tptTimelineRes.data : []}
      provinceTptData={provinceTptRes ? provinceTptRes.data : []}
    />
  );
}
