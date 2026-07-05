import BeritaClient from '@/app/berita/BeritaClient';
import { getSourceFreshness } from '@/lib/data-loader-server';

export default function BeritaPage() {
  const freshness = getSourceFreshness('news-aggregator');
  return <BeritaClient freshness={freshness} />;
}
