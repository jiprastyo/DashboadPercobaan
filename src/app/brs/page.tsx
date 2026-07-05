import BRSClient from './BRSClient';
import { getBPSBRSArchive, getSourceFreshness } from '@/lib/data-loader-server';

export default function BRSPage() {
  const archive = getBPSBRSArchive();
  const freshness = getSourceFreshness('bps-html');

  return <BRSClient archive={archive} freshness={freshness} />;
}
