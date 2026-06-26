import BRSClient from './BRSClient';
import { getBPSBRSArchive } from '@/lib/data-loader-server';

export default function BRSPage() {
  const archive = getBPSBRSArchive();

  return <BRSClient archive={archive} />;
}
