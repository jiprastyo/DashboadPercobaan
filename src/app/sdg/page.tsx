import {
  getBPSHistoricalData,
  getBPSSDGSakernasData,
} from '@/lib/data-loader-server';
import SDGSakernasClient from './SDGSakernasClient';

export default async function SDGPage() {
  const sdgRes = getBPSSDGSakernasData();
  const historicalRes = getBPSHistoricalData();

  return (
    <SDGSakernasClient
      sdgData={sdgRes}
      historicalData={historicalRes ? historicalRes.data : []}
    />
  );
}
