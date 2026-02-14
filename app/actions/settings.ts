"use server";

import { getDb } from "@/lib/db";
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

export async function importData(data: {
  items: Array<{
    surah_number: number;
    ayah_from: number;
    ayah_to: number;
    status: string;
    rating: number | null;
    notes: string;
  }>;
}) {
  const user = await requireAuth();
  const db = getDb();

  const insertItem = db.prepare(
    `INSERT INTO memorization_items (user_id, surah_number, ayah_from, ayah_to, status, rating, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const insertReview = db.prepare(
    `INSERT INTO review_items (user_id, item_id, interval, repetition, efactor, due_date, in_review_pool)
     VALUES (?, ?, 1, 0, 2.5, ?, 1)`,
  );

  const today = new Date().toISOString().split("T")[0];

  const transaction = db.transaction(() => {
    for (const item of data.items) {
      const result = insertItem.run(
        user.id,
        item.surah_number,
        item.ayah_from,
        item.ayah_to,
        item.status,
        item.rating,
        item.notes || "",
      );

      if (item.status === "learned") {
        insertReview.run(user.id, result.lastInsertRowid, today);
      }
    }
  });

  transaction();

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath("/review");
  return { success: true };
}

export async function updateProfile(formData: FormData) {
  const user = await requireAuth();
  const db = getDb();

  const name = formData.get("name") as string;
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

    if (newPassword.length < 6) {
      return { error: "New password must be at least 6 characters" };
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
