import { z } from "zod";
import { all, first, insertItems, q, syncReviewPool, type Ctx } from "./db";
import { checkPassword, newPasswordHash } from "./auth";
import { itemSchema } from "../lib/validation";

export async function exportData(c: Ctx) {
  const [items, reviews, logs] = await Promise.all(
    ["memorization_items", "review_items", "daily_logs"].map((t) =>
      all(c.db, `SELECT * FROM ${t} WHERE user_id = ?`, c.userId),
    ),
  );
  return { exportedAt: new Date().toISOString(), items, reviews, logs };
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

export async function importData(c: Ctx, raw: unknown) {
  const parsed = importSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `Invalid backup file: ${issue?.path.join(".")} ${issue?.message}` };
  }
  const { items, reviews = [] } = parsed.data;
  if (!items.length) return { success: true, count: 0 };

  const ins = await insertItems(c, items).run();
  // One INSERT assigns consecutive ids in array order, so item k got firstId + k.
  const firstId = ins.meta.last_row_id - items.length + 1;
  const reviewByOldId = new Map(reviews.map((r) => [r.item_id, r]));
  // Keep spaced-repetition progress from the backup when present; the rest get fresh entries.
  const kept = items.flatMap((item, k) => {
    const r = item.status === "learned" && item.id !== undefined ? reviewByOldId.get(item.id) : undefined;
    return r ? [{ ...r, item_id: firstId + k, last_reviewed: r.last_reviewed ?? null }] : [];
  });
  await c.db.batch([
    q(
      c.db,
      `INSERT INTO review_items (user_id, item_id, interval, repetition, efactor, due_date, last_reviewed, in_review_pool)
       SELECT ?, value ->> '$.item_id', value ->> '$.interval', value ->> '$.repetition', value ->> '$.efactor',
              value ->> '$.due_date', value ->> '$.last_reviewed', 1
       FROM json_each(?)`,
      c.userId,
      JSON.stringify(kept),
    ),
    syncReviewPool(c),
  ]);
  return { success: true, count: items.length };
}

export async function updateProfile(c: Ctx, form: Record<string, unknown>) {
  const str = (k: string) => (typeof form?.[k] === "string" ? (form[k] as string) : "");
  const name = str("name").trim().slice(0, 100);
  const currentPassword = str("current_password");
  const newPassword = str("new_password");

  if (currentPassword && newPassword) {
    const row = await first<{ pw_hash: string; salt: string }>(c.db, "SELECT pw_hash, salt FROM users WHERE id = ?", c.userId);
    if (!(await checkPassword(currentPassword, row))) return { error: "Current password is incorrect" };
    if (newPassword.length < 8) return { error: "New password must be at least 8 characters" };
    const h = await newPasswordHash(newPassword);
    await q(c.db, "UPDATE users SET pw_hash = ?, salt = ? WHERE id = ?", h.pw_hash, h.salt, c.userId).run();
  }
  if (name) await q(c.db, "UPDATE users SET name = ? WHERE id = ?", name, c.userId).run();
  return { success: true };
}
