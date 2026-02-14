"use server";

import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { JUZ_SEGMENTS } from "@/lib/juz-data";

export async function seedJuz(
  juzNumber: number,
  status: "planned" | "learning" | "learned" = "planned",
) {
  const user = await requireAuth();
  const db = getDb();

  const juzData = JUZ_SEGMENTS.find((j) => j.juzNumber === juzNumber);
  if (!juzData) {
    return { error: "Invalid Juz number" };
  }

  let addedCount = 0;
  let skippedCount = 0;

  const stmt = db.prepare(
    `INSERT INTO memorization_items (user_id, surah_number, ayah_from, ayah_to, status, rating, notes)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`,
  );

  const reviewStmt = db.prepare(
    `INSERT INTO review_items (user_id, item_id, interval, repetition, efactor, due_date, in_review_pool)
     VALUES (?, ?, 1, 0, 2.5, ?, 1)`,
  );

  const checkStmt = db.prepare(
    "SELECT id FROM memorization_items WHERE user_id = ? AND surah_number = ? AND ayah_from = ? AND ayah_to = ?",
  );

  const today = new Date().toISOString().split("T")[0];

  db.transaction(() => {
    for (const segment of juzData.segments) {
      const existing = checkStmt.get(
        user.id,
        segment.surah,
        segment.startAyah,
        segment.endAyah,
      );

      if (!existing) {
        const result = stmt.run(
          user.id,
          segment.surah,
          segment.startAyah,
          segment.endAyah,
          status,
          `Juz ${juzNumber} import`,
        );

        if (status === "learned") {
          reviewStmt.run(user.id, result.lastInsertRowid, today);
        }

        addedCount++;
      } else {
        skippedCount++;
      }
    }
  })();

  if (addedCount > 0) {
    // Log the addition
    const today = new Date().toISOString().split("T")[0];
    db.prepare(
      `INSERT INTO daily_logs (user_id, date, items_added, items_reviewed)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(user_id, date) DO UPDATE SET items_added = items_added + ?`,
    ).run(user.id, today, addedCount, addedCount);
  }

  revalidatePath("/items");
  revalidatePath("/");

  return { success: true, added: addedCount, skipped: skippedCount };
}
