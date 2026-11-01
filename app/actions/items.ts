"use server";

import { ensureReviewEntry, getDb, logActivity, transaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { parseItemForm } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export interface MemorizationItem {
  id: number;
  user_id: number;
  surah_number: number;
  ayah_from: number;
  ayah_to: number;
  status: "learned" | "learning" | "planned";
  rating: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function revalidateAll() {
  for (const p of ["/", "/items", "/review", "/juz"]) revalidatePath(p);
}

export async function addItem(formData: FormData) {
  const user = await requireAuth();
  const parsed = parseItemForm(formData);
  if (!parsed.data) return { error: parsed.error };
  const i = parsed.data;

  transaction(() => {
    const result = getDb()
      .prepare(
        `INSERT INTO memorization_items (user_id, surah_number, ayah_from, ayah_to, status, rating, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(user.id, i.surah_number, i.ayah_from, i.ayah_to, i.status, i.rating, i.notes);
    if (i.status === "learned") ensureReviewEntry(user.id, result.lastInsertRowid);
    logActivity(user.id, 1, 0);
  });

  revalidateAll();
  return { success: true };
}

export async function updateItem(formData: FormData) {
  const user = await requireAuth();
  const id = Number(formData.get("id"));
  const parsed = parseItemForm(formData);
  if (!parsed.data) return { error: parsed.error };
  const i = parsed.data;
  const db = getDb();

  const old = db
    .prepare("SELECT status FROM memorization_items WHERE id = ? AND user_id = ?")
    .get(id, user.id) as { status: string } | undefined;
  if (!old) return { error: "Item not found" };

  transaction(() => {
    db.prepare(
      `UPDATE memorization_items
       SET surah_number = ?, ayah_from = ?, ayah_to = ?, status = ?, rating = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
    ).run(i.surah_number, i.ayah_from, i.ayah_to, i.status, i.rating, i.notes, id, user.id);

    if (i.status === "learned") ensureReviewEntry(user.id, id);
    else if (old.status === "learned")
      db.prepare("DELETE FROM review_items WHERE item_id = ? AND user_id = ?").run(id, user.id);
  });

  revalidateAll();
  return { success: true };
}

export async function deleteItem(id: number): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();
  // review_items rows go with it via ON DELETE CASCADE.
  getDb().prepare("DELETE FROM memorization_items WHERE id = ? AND user_id = ?").run(id, user.id);
  revalidateAll();
  return { success: true };
}

export async function getItems(status?: string) {
  const user = await requireAuth();
  const db = getDb();
  return (
    status
      ? db
          .prepare(
            "SELECT * FROM memorization_items WHERE user_id = ? AND status = ? ORDER BY surah_number, ayah_from",
          )
          .all(user.id, status)
      : db
          .prepare("SELECT * FROM memorization_items WHERE user_id = ? ORDER BY surah_number, ayah_from")
          .all(user.id)
  ) as unknown as MemorizationItem[];
}
