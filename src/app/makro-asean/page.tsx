import { getASEANComparableData, getBPSHistoricalData } from '@/lib/data-loader-server';
import MakroASEANClient from './MakroASEANClient';

export default function MakroASEANPage() {
  const bpsHistorical = getBPSHistoricalData();
  const comparableData = getASEANComparableData(bpsHistorical);

  return (
    <MakroASEANClient comparableData={comparableData} />
  );
}
