"use server";

import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
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

export async function addItem(formData: FormData) {
  const user = await requireAuth();
  const db = getDb();

  const surahNumber = parseInt(formData.get("surah_number") as string);
  const ayahFrom = parseInt(formData.get("ayah_from") as string);
  const ayahTo = parseInt(formData.get("ayah_to") as string);
  const status = formData.get("status") as string;
  const rating = formData.get("rating")
    ? parseInt(formData.get("rating") as string)
    : null;
  const notes = (formData.get("notes") as string) || "";

  if (!surahNumber || !ayahFrom || !ayahTo) {
    return { error: "Surah and ayah range are required" };
  }

  if (ayahFrom > ayahTo) {
    return { error: "Start ayah must be less than or equal to end ayah" };
  }

  const result = db
    .prepare(
      `INSERT INTO memorization_items (user_id, surah_number, ayah_from, ayah_to, status, rating, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      user.id,
      surahNumber,
      ayahFrom,
      ayahTo,
      status || "planned",
      rating,
      notes,
    );

  // If status is 'learned', create review_items entry
  if (status === "learned") {
    const today = new Date().toISOString().split("T")[0];
    db.prepare(
      `INSERT INTO review_items (user_id, item_id, interval, repetition, efactor, due_date, in_review_pool)
       VALUES (?, ?, 1, 0, 2.5, ?, 1)`,
    ).run(user.id, result.lastInsertRowid, today);
  }

  // Log the addition
  const today = new Date().toISOString().split("T")[0];
  db.prepare(
    `INSERT INTO daily_logs (user_id, date, items_added, items_reviewed)
     VALUES (?, ?, 1, 0)
     ON CONFLICT(user_id, date) DO UPDATE SET items_added = items_added + 1`,
  ).run(user.id, today);

  revalidatePath("/items");
  revalidatePath("/");
  return { success: true };
}

export async function updateItem(formData: FormData) {
  const user = await requireAuth();
  const db = getDb();

  const id = parseInt(formData.get("id") as string);
  const surahNumber = parseInt(formData.get("surah_number") as string);
  const ayahFrom = parseInt(formData.get("ayah_from") as string);
  const ayahTo = parseInt(formData.get("ayah_to") as string);
  const status = formData.get("status") as string;
  const rating = formData.get("rating")
    ? parseInt(formData.get("rating") as string)
    : null;
  const notes = (formData.get("notes") as string) || "";

  // Get old status before update
  const oldItem = db
    .prepare(
      "SELECT status FROM memorization_items WHERE id = ? AND user_id = ?",
    )
    .get(id, user.id) as { status: string } | undefined;

  if (!oldItem) return { error: "Item not found" };

  db.prepare(
    `UPDATE memorization_items
     SET surah_number = ?, ayah_from = ?, ayah_to = ?, status = ?, rating = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`,
  ).run(surahNumber, ayahFrom, ayahTo, status, rating, notes, id, user.id);

  // Handle status transitions for review_items
  if (oldItem.status !== "learned" && status === "learned") {
    // Promoted to learned -> create review entry
    const today = new Date().toISOString().split("T")[0];
    const existing = db
      .prepare("SELECT id FROM review_items WHERE item_id = ? AND user_id = ?")
      .get(id, user.id);
    if (!existing) {
      db.prepare(
        `INSERT INTO review_items (user_id, item_id, interval, repetition, efactor, due_date, in_review_pool)
         VALUES (?, ?, 1, 0, 2.5, ?, 1)`,
      ).run(user.id, id, today);
    }
  } else if (oldItem.status === "learned" && status !== "learned") {
    // Demoted from learned -> remove review entry
    db.prepare(
      "DELETE FROM review_items WHERE item_id = ? AND user_id = ?",
    ).run(id, user.id);
  }

  revalidatePath("/items");
  revalidatePath("/review");
  revalidatePath("/");
  return { success: true };
}

export async function deleteItem(id: number) {
  try {
    const user = await requireAuth();
    const db = getDb();

    db.prepare(
      "DELETE FROM review_items WHERE item_id = ? AND user_id = ?",
    ).run(id, user.id);
    db.prepare(
      "DELETE FROM memorization_items WHERE id = ? AND user_id = ?",
    ).run(id, user.id);

    revalidatePath("/items");
    revalidatePath("/review");
    revalidatePath("/");
    return { success: true, error: undefined };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to delete item" };
  }
}

export async function getItems(status?: string) {
  const user = await requireAuth();
  const db = getDb();

  if (status) {
    return db
      .prepare(
        "SELECT * FROM memorization_items WHERE user_id = ? AND status = ? ORDER BY surah_number, ayah_from",
      )
      .all(user.id, status) as MemorizationItem[];
  }

  return db
    .prepare(
      "SELECT * FROM memorization_items WHERE user_id = ? ORDER BY surah_number, ayah_from",
    )
    .all(user.id) as MemorizationItem[];
}

export async function getItemsByJuz(juzNumber: number) {
  const user = await requireAuth();
  const db = getDb();
  const { getSurahsByJuz } = await import("@/lib/quran-data");

  const surahs = getSurahsByJuz(juzNumber);
  const surahNumbers = surahs.map((s) => s.number);

  if (surahNumbers.length === 0) return [];

  const placeholders = surahNumbers.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT * FROM memorization_items WHERE user_id = ? AND surah_number IN (${placeholders}) ORDER BY surah_number, ayah_from`,
    )
    .all(user.id, ...surahNumbers) as MemorizationItem[];
}
