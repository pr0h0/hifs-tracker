"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemCard } from "@/components/item-card";
import { AddItemDialog } from "@/components/add-item-dialog";
import { deleteItem, type MemorizationItem } from "@/app/actions/items";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { JUZ_LIST, SURAHS } from "@/lib/quran-data";
import { toast } from "sonner";
import { BookOpenText } from "lucide-react";

interface ItemsClientProps {
  initialItems: MemorizationItem[];
}

export function ItemsClient({ initialItems }: ItemsClientProps) {
  const [editingItem, setEditingItem] = useState<MemorizationItem | null>(null);
  const [juzFilter, setJuzFilter] = useState<string>("all");
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const items = initialItems;

  function getFilteredItems(status?: string) {
    let filtered = status ? items.filter((i) => i.status === status) : items;

    if (juzFilter !== "all") {
      const juzNumber = parseInt(juzFilter);
      const surahsInJuz = SURAHS.filter((s) => s.juz.includes(juzNumber)).map(
        (s) => s.number,
      );
      filtered = filtered.filter((i) => surahsInJuz.includes(i.surah_number));
    }

    return filtered;
  }

  function handleDelete(id: number) {
    setItemToDelete(id);
  }

  async function confirmDelete() {
    if (!itemToDelete) return;
    const result = await deleteItem(itemToDelete);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Item deleted");
    }
    setItemToDelete(null);
  }

  const allItems = getFilteredItems();
  const learnedItems = getFilteredItems("learned");
  const learningItems = getFilteredItems("learning");
  const plannedItems = getFilteredItems("planned");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-balance">My Items</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your memorization items
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={juzFilter} onValueChange={setJuzFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by Juz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Juz</SelectItem>
              {JUZ_LIST.map((juz) => (
                <SelectItem key={juz} value={juz.toString()}>
                  Juz {juz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AddItemDialog />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All ({allItems.length})</TabsTrigger>
          <TabsTrigger value="learned">
            Learned ({learnedItems.length})
          </TabsTrigger>
          <TabsTrigger value="learning">
            Learning ({learningItems.length})
          </TabsTrigger>
          <TabsTrigger value="planned">
            Planned ({plannedItems.length})
          </TabsTrigger>
        </TabsList>

        {["all", "learned", "learning", "planned"].map((tab) => {
          const tabItems =
            tab === "all"
              ? allItems
              : tab === "learned"
                ? learnedItems
                : tab === "learning"
                  ? learningItems
                  : plannedItems;

          return (
            <TabsContent key={tab} value={tab}>
              {tabItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpenText className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <h3 className="font-medium text-muted-foreground">
                    No items yet
                  </h3>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Add your first memorization item to get started.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tabItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEdit={setEditingItem}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {editingItem && (
        <AddItemDialog
          editItem={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              memorization item and its history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
