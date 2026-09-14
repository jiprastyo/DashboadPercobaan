import BRSClient from './BRSClient';
import { getBPSBRSArchive, getSourceFreshness } from '@/lib/data-loader-server';

export const metadata = {
  title: 'Berita Resmi Statistik (BPS)',
  description:
    'Daftar Berita Resmi Statistik BPS kronologis: ketenagakerjaan, inflasi, ekspor-impor, pertumbuhan ekonomi, kemiskinan, dan NTP, dengan tautan PDF resmi.',
};

export default function BRSPage() {
  const archive = getBPSBRSArchive();
  const freshness = getSourceFreshness('bps-html');

  return <BRSClient archive={archive} freshness={freshness} />;
}
