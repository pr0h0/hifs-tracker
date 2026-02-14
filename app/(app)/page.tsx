import { getDashboardStats } from "@/app/actions/daily-log";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return <DashboardClient stats={stats} />;
}
