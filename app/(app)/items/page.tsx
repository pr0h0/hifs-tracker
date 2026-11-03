"use client";

import { useApi, type MemorizationItem } from "@/lib/api";
import { ItemsClient } from "@/components/items-client";
import { PageLoader } from "@/components/page-loader";

export default function ItemsPage() {
  const { data, error } = useApi<MemorizationItem[]>("getItems");
  return data ? <ItemsClient initialItems={data} /> : <PageLoader error={error} />;
}
