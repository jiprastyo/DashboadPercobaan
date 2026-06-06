import { getSampleASEANData } from '@/lib/data-loader';
import { getASEANHistoricalData } from '@/lib/data-loader-server';
import MakroASEANClient from './MakroASEANClient';

export default function MakroASEANPage() {
  // Load local sample data (current snapshot)
  const aseanData = getSampleASEANData();
  
  // Load real historical data scraped from World Bank / NSO
  const historicalData = getASEANHistoricalData();

  return (
    <MakroASEANClient 
      aseanData={aseanData} 
      historicalData={historicalData} 
    />
  );
}
