"use server";

import { ensureReviewEntry, getDb, logActivity, transaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { JUZ_SEGMENTS } from "@/lib/juz-data";
import { STATUSES } from "@/lib/validation";

export async function seedJuz(
  juzNumber: number,
  status: "planned" | "learning" | "learned" = "planned",
) {
  const user = await requireAuth();
  const db = getDb();

  const juzData = JUZ_SEGMENTS.find((j) => j.juzNumber === juzNumber);
  if (!juzData || !STATUSES.includes(status)) {
    return { error: "Invalid Juz or status" };
  }

  let addedCount = 0;
  let skippedCount = 0;

  const insert = db.prepare(
    `INSERT INTO memorization_items (user_id, surah_number, ayah_from, ayah_to, status, rating, notes)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`,
  );
  // Skip segments already covered by an existing item.
  const covered = db.prepare(
    "SELECT id FROM memorization_items WHERE user_id = ? AND surah_number = ? AND ayah_from <= ? AND ayah_to >= ?",
  );

  transaction(() => {
    for (const segment of juzData.segments) {
      if (covered.get(user.id, segment.surah, segment.startAyah, segment.endAyah)) {
        skippedCount++;
        continue;
      }
      const result = insert.run(
        user.id,
        segment.surah,
        segment.startAyah,
        segment.endAyah,
        status,
        `Juz ${juzNumber} import`,
      );
      if (status === "learned") ensureReviewEntry(user.id, result.lastInsertRowid);
      addedCount++;
    }
    if (addedCount > 0) logActivity(user.id, addedCount, 0);
  });

  revalidatePath("/items");
  revalidatePath("/juz");
  revalidatePath("/");

  return { success: true, added: addedCount, skipped: skippedCount };
}
