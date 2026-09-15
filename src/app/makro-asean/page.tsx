import { getASEANComparableData, getBPSHistoricalData, getBenchmarkTargets, getManualSourceFreshness, getSourceFreshness } from '@/lib/data-loader-server';
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
  const aseanFallbackFreshness = (() => {
    const fromRuns = getSourceFreshness('asean-tiered');
    // Before the scraper's first CI run there is no ops entry yet — fall back
    // to the data file's own _scraped_at so the badge reflects committed data.
    if (!fromRuns.lastFetch) {
      return getManualSourceFreshness('asean-tiered', comparableData?.worldBank?._scraped_at);
    }
    return fromRuns;
  })();

  return (
    <MakroASEANClient
      comparableData={comparableData}
      benchmarkTargets={benchmarkTargets}
      aseanFallbackFreshness={aseanFallbackFreshness}
    />
  );
}
