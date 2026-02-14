"use server";

import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  calculateSM2,
  getTargetQueueSize,
  type ReviewQueueItem,
} from "@/lib/sm2";
import { revalidatePath } from "next/cache";
import { getSurahsByJuz } from "@/lib/quran-data";

export async function getDailyReviewQueue(
  includeLearning = true,
  includeLearned = true,
  limit?: number,
  juz?: number,
): Promise<ReviewQueueItem[]> {
  const user = await requireAuth();
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  const queue: ReviewQueueItem[] = [];

  let surahFilter = "";
  let surahParams: number[] = [];

  if (juz) {
    const surahs = getSurahsByJuz(juz);
    if (surahs.length > 0) {
      const numbers = surahs.map((s) => s.number);
      surahFilter = ` AND m.surah_number IN (${numbers.map(() => "?").join(",")})`;
      surahParams = numbers;
    } else {
      return [];
    }
  }

  // Tier 1: "learning" items (repeat daily, no SM-2)
  if (includeLearning) {
    const learningItems = db
      .prepare(
        `SELECT m.id as item_id, m.surah_number, m.ayah_from, m.ayah_to, m.status, m.rating, m.notes
         FROM memorization_items m
         WHERE m.user_id = ? AND m.status = 'learning'${surahFilter}
         ORDER BY m.surah_number, m.ayah_from`,
      )
      .all(user.id, ...surahParams) as Array<{
      item_id: number;
      surah_number: number;
      ayah_from: number;
      ayah_to: number;
      status: string;
      rating: number | null;
      notes: string;
    }>;

    for (const item of learningItems) {
      queue.push({
        id: 0,
        item_id: item.item_id,
        surah_number: item.surah_number,
        ayah_from: item.ayah_from,
        ayah_to: item.ayah_to,
        status: item.status,
        rating: item.rating,
        notes: item.notes,
        source: "learning",
      });
    }
  }

  // Get target queue size based on what we have so far
  // If we only want "learning", targetSize is effectively queue.length unless we want to pad?
  // If we only want "learned", learningItems is empty.
  // The logic below relies on `queue.length`.
  // If `includeLearned` is false, we just stop here.

  if (!includeLearned) {
    if (limit && queue.length > limit) {
      return queue.slice(0, limit);
    }
    return queue;
  }

  const targetSize = limit || getTargetQueueSize(queue);

  // Tier 2: SM-2 due items (learned status, due today or overdue)
  if (queue.length < targetSize) {
    const dueItems = db
      .prepare(
        `SELECT r.id, r.item_id, r.interval, r.repetition, r.efactor, r.due_date,
                m.surah_number, m.ayah_from, m.ayah_to, m.status, m.rating, m.notes
         FROM review_items r
         JOIN memorization_items m ON r.item_id = m.id
         WHERE r.user_id = ? AND r.in_review_pool = 1 AND r.due_date <= ? AND m.status = 'learned'${surahFilter}
         ORDER BY r.due_date ASC
         LIMIT ?`,
      )
      .all(user.id, today, ...surahParams, targetSize - queue.length) as Array<{
      id: number;
      item_id: number;
      interval: number;
      repetition: number;
      efactor: number;
      due_date: string;
      surah_number: number;
      ayah_from: number;
      ayah_to: number;
      status: string;
      rating: number | null;
      notes: string;
    }>;

    for (const item of dueItems) {
      queue.push({
        id: item.id,
        item_id: item.item_id,
        surah_number: item.surah_number,
        ayah_from: item.ayah_from,
        ayah_to: item.ayah_to,
        status: item.status,
        rating: item.rating,
        notes: item.notes,
        interval: item.interval,
        repetition: item.repetition,
        efactor: item.efactor,
        due_date: item.due_date,
        source: "due",
      });
    }
  }

  // Tier 3: Random fill from learned items (even if not due)
  if (queue.length < targetSize) {
    const existingItemIds = queue.map((q) => q.item_id);
    const placeholders =
      existingItemIds.length > 0
        ? existingItemIds.map(() => "?").join(",")
        : "0";

    const randomItems = db
      .prepare(
        `SELECT r.id, r.item_id, r.interval, r.repetition, r.efactor, r.due_date,
                m.surah_number, m.ayah_from, m.ayah_to, m.status, m.rating, m.notes
         FROM review_items r
         JOIN memorization_items m ON r.item_id = m.id
         WHERE r.user_id = ? AND r.in_review_pool = 1 AND m.status = 'learned'${surahFilter}
         AND r.item_id NOT IN (${placeholders})
         ORDER BY RANDOM()
         LIMIT ?`,
      )
      .all(
        user.id,
        ...surahParams,
        ...existingItemIds,
        targetSize - queue.length,
      ) as Array<{
      id: number;
      item_id: number;
      interval: number;
      repetition: number;
      efactor: number;
      due_date: string;
      surah_number: number;
      ayah_from: number;
      ayah_to: number;
      status: string;
      rating: number | null;
      notes: string;
    }>;

    for (const item of randomItems) {
      queue.push({
        id: item.id,
        item_id: item.item_id,
        surah_number: item.surah_number,
        ayah_from: item.ayah_from,
        ayah_to: item.ayah_to,
        status: item.status,
        rating: item.rating,
        notes: item.notes,
        interval: item.interval,
        repetition: item.repetition,
        efactor: item.efactor,
        due_date: item.due_date,
        source: "random",
      });
    }
  }

  return queue;
}

export async function submitReview(itemId: number, quality: number) {
  const user = await requireAuth();
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  // Get the memorization item
  const item = db
    .prepare("SELECT * FROM memorization_items WHERE id = ? AND user_id = ?")
    .get(itemId, user.id) as
    | { id: number; status: string; rating: number | null }
    | undefined;

  if (!item) return { error: "Item not found" };

  // Update the item's rating
  db.prepare(
    "UPDATE memorization_items SET rating = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(quality, itemId);

  // If item is "learned", update SM-2 scheduling
  if (item.status === "learned") {
    const reviewItem = db
      .prepare("SELECT * FROM review_items WHERE item_id = ? AND user_id = ?")
      .get(itemId, user.id) as
      | {
          id: number;
          interval: number;
          repetition: number;
          efactor: number;
        }
      | undefined;

    if (reviewItem) {
      const result = calculateSM2(
        quality,
        reviewItem.interval,
        reviewItem.repetition,
        reviewItem.efactor,
      );

      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + result.interval);

      db.prepare(
        `UPDATE review_items
         SET interval = ?, repetition = ?, efactor = ?, due_date = ?, last_reviewed = ?
         WHERE id = ?`,
      ).run(
        result.interval,
        result.repetition,
        result.efactor,
        nextDueDate.toISOString().split("T")[0],
        today,
        reviewItem.id,
      );
    }
  }

  // Log the review
  db.prepare(
    `INSERT INTO daily_logs (user_id, date, items_reviewed, items_added)
     VALUES (?, ?, 1, 0)
     ON CONFLICT(user_id, date) DO UPDATE SET items_reviewed = items_reviewed + 1`,
  ).run(user.id, today);

  revalidatePath("/review");
  revalidatePath("/");
  return {
    success: true,
    suggestPromote: item.status === "learning" && quality >= 4,
  };
}

export async function promoteToLearned(itemId: number) {
  const user = await requireAuth();
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  db.prepare(
    "UPDATE memorization_items SET status = 'learned', updated_at = datetime('now') WHERE id = ? AND user_id = ?",
  ).run(itemId, user.id);

  // Create review_items entry
  const existing = db
    .prepare("SELECT id FROM review_items WHERE item_id = ? AND user_id = ?")
    .get(itemId, user.id);

  if (!existing) {
    db.prepare(
      `INSERT INTO review_items (user_id, item_id, interval, repetition, efactor, due_date, in_review_pool)
       VALUES (?, ?, 1, 0, 2.5, ?, 1)`,
    ).run(user.id, itemId, today);
  }

  revalidatePath("/review");
  revalidatePath("/items");
  revalidatePath("/");
  return { success: true };
}
