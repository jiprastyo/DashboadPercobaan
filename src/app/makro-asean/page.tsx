import { getASEANComparableData, getBPSHistoricalData, getBenchmarkTargets } from '@/lib/data-loader-server';
import MakroASEANClient from './MakroASEANClient';

export default function MakroASEANPage() {
  const bpsHistorical = getBPSHistoricalData();
  const comparableData = getASEANComparableData(bpsHistorical);
  const benchmarkTargets = getBenchmarkTargets();

  return (
    <MakroASEANClient comparableData={comparableData} benchmarkTargets={benchmarkTargets} />
  );
}
