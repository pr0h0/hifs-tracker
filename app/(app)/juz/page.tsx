"use client";

import { useApi, type MemorizationItem } from "@/lib/api";
import { JuzClient } from "@/components/juz-client";
import { PageLoader } from "@/components/page-loader";

export default function JuzPage() {
  const { data, error } = useApi<MemorizationItem[]>("getItems");
  return data ? <JuzClient allItems={data} /> : <PageLoader error={error} />;
}
