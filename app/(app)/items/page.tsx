import { getItems } from "@/app/actions/items";
import { ItemsClient } from "@/components/items-client";

export default async function ItemsPage() {
  const items = await getItems();

  return <ItemsClient initialItems={items} />;
}
