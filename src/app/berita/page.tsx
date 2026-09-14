import BeritaClient from '@/app/berita/BeritaClient';
import { getSourceFreshness } from '@/lib/data-loader-server';

export const metadata = {
  title: 'Arsip Berita Ketenagakerjaan',
  description:
    'Arsip berita ketenagakerjaan Indonesia dari 30 outlet nasional dan daerah, dengan filter sektor KBLI, kata kunci, provinsi, dan kualitas tanggal.',
};

export default function BeritaPage() {
  const freshness = getSourceFreshness('news-aggregator');
  return <BeritaClient freshness={freshness} />;
}
