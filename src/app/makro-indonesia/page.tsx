import { getSamplePMIData, getSamplePHKData, getSampleBPSData } from '@/lib/data-loader';
import { getASEANHistoricalData, getBPSNationalData, getBPSProvinsiData, getBPSHistoricalIhkTradeData, getBPSWismanData } from '@/lib/data-loader-server';
import MakroIndonesiaClient from './MakroIndonesiaClient';

export default async function MakroIndonesiaPage() {
  const nationalRes = getBPSNationalData();
  const provinsiRes = getBPSProvinsiData();
  const ihkTradeRes = getBPSHistoricalIhkTradeData();
  const wismanRes = getBPSWismanData();
  
  const bpsData = nationalRes ? nationalRes.data : getSampleBPSData();
  const bpsSource = nationalRes ? nationalRes.source : 'static_seed';
  
  const provinsiData = provinsiRes ? provinsiRes.data : [];
  const provinsiSource = provinsiRes ? provinsiRes.source : 'fallback_spreadsheet';

  const pmiData = getSamplePMIData();
  const phkData = getSamplePHKData();
  const historicalData = await getASEANHistoricalData();

  return (
    <MakroIndonesiaClient 
      bpsData={bpsData} 
      bpsSource={bpsSource}
      provinsiData={provinsiData}
      provinsiSource={provinsiSource}
      pmiData={pmiData} 
      phkData={phkData} 
      historicalData={historicalData} 
      historicalIhkTradeData={ihkTradeRes ? ihkTradeRes.data : []}
      wismanData={wismanRes ? wismanRes.data : []}
    />
  );
}
