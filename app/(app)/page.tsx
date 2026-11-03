"use client";

import { useApi, type DashboardStats } from "@/lib/api";
import { DashboardClient } from "@/components/dashboard-client";
import { PageLoader } from "@/components/page-loader";

export default function DashboardPage() {
  const { data, error } = useApi<DashboardStats>("getDashboardStats");
  return data ? <DashboardClient stats={data} /> : <PageLoader error={error} />;
}
