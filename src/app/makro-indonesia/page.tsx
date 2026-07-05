import { getSampleBPSData } from '@/lib/data-loader';
import { getBIPMIData, getBPSNationalData, getBPSProvinsiData, getBPSProvinsiHistoricalData, getBPSHistoricalIhkTradeData, getBPSWismanData, getBPSTptHistoricalData, getPHKArticles, getPHKIntensitySeries, getBenchmarkTargets } from '@/lib/data-loader-server';
import MakroIndonesiaClient from './MakroIndonesiaClient';

export default async function MakroIndonesiaPage() {
  const nationalRes = getBPSNationalData();
  const provinsiRes = getBPSProvinsiData();
  const provinsiHistoricalRes = getBPSProvinsiHistoricalData();
  const ihkTradeRes = getBPSHistoricalIhkTradeData();
  const wismanRes = getBPSWismanData();
  const bpsTptHistoricalRes = getBPSTptHistoricalData();
  
  const bpsData = nationalRes ? nationalRes.data : getSampleBPSData();
  const bpsSource = nationalRes ? nationalRes.source : 'static_seed';
  
  const provinsiData = provinsiRes ? provinsiRes.data : [];
  const provinsiSource = provinsiRes ? provinsiRes.source : 'fallback_spreadsheet';

  const pmiData = getBIPMIData();
  const phkData = getPHKArticles();
  const phkIntensity = getPHKIntensitySeries();
  const benchmarkTargets = getBenchmarkTargets();
  return (
    <MakroIndonesiaClient 
      bpsData={bpsData} 
      bpsSource={bpsSource}
      provinsiData={provinsiData}
      provinsiSource={provinsiSource}
      provinsiHistoricalData={provinsiHistoricalRes ? provinsiHistoricalRes.data : []}
      pmiData={pmiData} 
      phkData={phkData} 
      phkIntensity={phkIntensity}
      historicalIhkTradeData={ihkTradeRes ? ihkTradeRes.data : []}
      wismanData={wismanRes ? wismanRes.data : []}
      bpsTptHistoricalData={bpsTptHistoricalRes ? bpsTptHistoricalRes.data : []}
      benchmarkTargets={benchmarkTargets}
    />
  );
}
