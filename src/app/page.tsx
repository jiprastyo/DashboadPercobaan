import OverviewDashboard from '@/components/dashboard/OverviewDashboard';
import { getOverviewDashboardData } from '@/lib/overview-data';

// No title here on purpose: the root IS the site default
// ("Monitoring Tak Resmi" from layout.tsx metadata.title.default).
export const metadata = {
  description:
    'Ringkasan statistik ketenagakerjaan Indonesia: TPT terbaru, inflasi, PMI, berita, riset akademik, dan cuplikan ASEAN.',
};

export default async function IkhtisarPage() {
  const data = await getOverviewDashboardData();

  return <OverviewDashboard data={data} />;
}
