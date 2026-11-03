"use client";

import { useApi, type User } from "@/lib/api";
import { SettingsClient } from "@/components/settings-client";
import { PageLoader } from "@/components/page-loader";

export default function SettingsPage() {
  const { data, error } = useApi<User>("me");
  return data ? <SettingsClient user={data} /> : <PageLoader error={error} />;
}
