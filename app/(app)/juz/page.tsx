import { getItems } from "@/app/actions/items";
import { JuzClient } from "@/components/juz-client";

export default async function JuzPage() {
  const items = await getItems();
  return <JuzClient allItems={items} />;
}
