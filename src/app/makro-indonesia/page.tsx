import { getSampleBPSData, getSamplePMIData, getSamplePHKData } from '@/lib/data-loader';
import { getASEANHistoricalData } from '@/lib/data-loader-server';
import MakroIndonesiaClient from './MakroIndonesiaClient';

export default async function MakroIndonesiaPage() {
  const bpsData = getSampleBPSData();
  const pmiData = getSamplePMIData();
  const phkData = getSamplePHKData();
  const historicalData = await getASEANHistoricalData();

  return (
    <MakroIndonesiaClient 
      bpsData={bpsData} 
      pmiData={pmiData} 
      phkData={phkData} 
      historicalData={historicalData} 
    />
  );
}
