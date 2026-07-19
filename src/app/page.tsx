import OverviewDashboard from '@/components/dashboard/OverviewDashboard';
import { getOverviewDashboardData } from '@/lib/overview-data';

export default async function IkhtisarPage() {
  const data = await getOverviewDashboardData();

  return <OverviewDashboard data={data} />;
}
