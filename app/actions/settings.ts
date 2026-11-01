"use server";

import { ensureReviewEntry, getDb, transaction } from "@/lib/db";
import { itemSchema } from "@/lib/validation";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function exportData() {
  const user = await requireAuth();
  const db = getDb();

  const items = db
    .prepare("SELECT * FROM memorization_items WHERE user_id = ?")
    .all(user.id);

  const reviews = db
    .prepare("SELECT * FROM review_items WHERE user_id = ?")
    .all(user.id);

  const logs = db
    .prepare("SELECT * FROM daily_logs WHERE user_id = ?")
    .all(user.id);

  return {
    exportedAt: new Date().toISOString(),
    items,
    reviews,
    logs,
  };
}

const reviewSchema = z.object({
  item_id: z.number().int(),
  interval: z.number().min(0),
  repetition: z.number().int().min(0),
  efactor: z.number().min(1.3).max(5),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  last_reviewed: z.string().nullish(),
});

const importSchema = z.object({
  items: z.array(itemSchema.and(z.object({ id: z.number().int().optional() }))).max(10000),
  reviews: z.array(reviewSchema).optional(),
});

export async function importData(raw: unknown) {
  const user = await requireAuth();
  const parsed = importSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `Invalid backup file: ${issue?.path.join(".")} ${issue?.message}` };
  }
  const { items, reviews = [] } = parsed.data;
  const reviewByOldId = new Map(reviews.map((r) => [r.item_id, r]));
  const db = getDb();

  const insertItem = db.prepare(
    `INSERT INTO memorization_items (user_id, surah_number, ayah_from, ayah_to, status, rating, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertReview = db.prepare(
    `INSERT INTO review_items (user_id, item_id, interval, repetition, efactor, due_date, last_reviewed, in_review_pool)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  );

  transaction(() => {
    for (const item of items) {
      const { lastInsertRowid } = insertItem.run(
        user.id,
        item.surah_number,
        item.ayah_from,
        item.ayah_to,
        item.status,
        item.rating,
        item.notes,
      );
      if (item.status !== "learned") continue;
      // Keep spaced-repetition progress from the backup when present.
      const r = item.id !== undefined ? reviewByOldId.get(item.id) : undefined;
      if (r)
        insertReview.run(user.id, lastInsertRowid, r.interval, r.repetition, r.efactor, r.due_date, r.last_reviewed ?? null);
      else ensureReviewEntry(user.id, lastInsertRowid);
    }
  });

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath("/review");
  revalidatePath("/juz");
  return { success: true, count: items.length };
}

export async function updateProfile(formData: FormData) {
  const user = await requireAuth();
  const db = getDb();

  const name = ((formData.get("name") as string) || "").trim().slice(0, 100);
  const currentPassword = formData.get("current_password") as string;
  const newPassword = formData.get("new_password") as string;

  if (name) {
    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, user.id);
  }

  if (currentPassword && newPassword) {
    const userData = db
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .get(user.id) as { password_hash: string };

    const valid = await bcrypt.compare(currentPassword, userData.password_hash);
    if (!valid) {
      return { error: "Current password is incorrect" };
    }

    if (newPassword.length < 8) {
      return { error: "New password must be at least 8 characters" };
    }

    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      hash,
      user.id,
    );
  }

  revalidatePath("/");
  return { success: true };
}
