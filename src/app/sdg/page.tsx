import {
  getBPSHistoricalData,
  getBPSSDGSakernasData,
  getBPSTptHistoricalData,
  getBPSProvinsiHistoricalData,
} from '@/lib/data-loader-server';
import SDGSakernasClient from '../sdg-sakernas/SDGSakernasClient';

export default async function SDGPage() {
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
