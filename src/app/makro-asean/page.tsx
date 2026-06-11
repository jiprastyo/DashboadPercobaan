import { getASEANHistoricalData } from '@/lib/data-loader-server';
import MakroASEANClient from './MakroASEANClient';

export default function MakroASEANPage() {
  // Load real historical data scraped from World Bank / NSO
  const historicalData = getASEANHistoricalData();

  return (
    <MakroASEANClient historicalData={historicalData} />
  );
}
