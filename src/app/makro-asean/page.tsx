import { getASEANComparableData, getBPSHistoricalData, getBenchmarkTargets, getSourceFreshness } from '@/lib/data-loader-server';
import MakroASEANClient from './MakroASEANClient';

export default function MakroASEANPage() {
  const bpsHistorical = getBPSHistoricalData();
  const comparableData = getASEANComparableData(bpsHistorical);
  const benchmarkTargets = getBenchmarkTargets();
  const aseanFallbackFreshness = getSourceFreshness('asean-fallback');

  return (
    <MakroASEANClient
      comparableData={comparableData}
      benchmarkTargets={benchmarkTargets}
      aseanFallbackFreshness={aseanFallbackFreshness}
    />
  );
}
