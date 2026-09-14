import { getASEANComparableData, getBPSHistoricalData, getBenchmarkTargets, getSourceFreshness } from '@/lib/data-loader-server';
import MakroASEANClient from './MakroASEANClient';

export const metadata = {
  title: 'Makro ASEAN',
  description:
    'Perbandingan pengangguran, TPAK, dan rasio pekerja ASEAN 11 negara: seri resmi BPS/NSO dengan overlay estimasi model World Bank/ILO.',
};

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
