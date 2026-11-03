import { all, dropUnlearnedReviews, insertItems, logActivity, q, syncReviewPool, type Ctx } from "./db";
import { parseItem, STATUSES } from "../lib/validation";
import { JUZ_SEGMENTS } from "../lib/juz-data";
import type { MemorizationItem } from "../lib/types";

export function getItems(c: Ctx) {
  return all<MemorizationItem>(
    c.db,
    "SELECT * FROM memorization_items WHERE user_id = ? ORDER BY surah_number, ayah_from",
    c.userId,
  );
}

export async function addItem(c: Ctx, form: unknown) {
  const parsed = parseItem(form);
  if (!parsed.data) return { error: parsed.error };
  await c.db.batch([insertItems(c, [parsed.data]), syncReviewPool(c), logActivity(c, 1, 0)]);
  return { success: true };
}

export async function updateItem(c: Ctx, form: { id?: unknown }) {
  const id = Number(form?.id);
  const parsed = parseItem(form);
  if (!parsed.data) return { error: parsed.error };
  const i = parsed.data;
  const [res] = await c.db.batch([
    q(
      c.db,
      `UPDATE memorization_items
       SET surah_number = ?, ayah_from = ?, ayah_to = ?, status = ?, rating = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      i.surah_number, i.ayah_from, i.ayah_to, i.status, i.rating, i.notes, id, c.userId,
    ),
    dropUnlearnedReviews(c),
    syncReviewPool(c),
  ]);
  if (!res.meta.changes) return { error: "Item not found" };
  return { success: true };
}

export async function deleteItem(c: Ctx, id: unknown) {
  await c.db.batch([
    q(c.db, "DELETE FROM review_items WHERE item_id = ? AND user_id = ?", Number(id), c.userId),
    q(c.db, "DELETE FROM memorization_items WHERE id = ? AND user_id = ?", Number(id), c.userId),
  ]);
  return { success: true };
}

export async function seedJuz(c: Ctx, juzNumber: unknown, status: unknown = "planned") {
  const juz = JUZ_SEGMENTS.find((j) => j.juzNumber === Number(juzNumber));
  if (!juz || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    return { error: "Invalid Juz or status" };
  }
  // Skip segments already covered by an existing item.
  const existing = await all<{ surah_number: number; ayah_from: number; ayah_to: number }>(
    c.db,
    "SELECT surah_number, ayah_from, ayah_to FROM memorization_items WHERE user_id = ?",
    c.userId,
  );
  const fresh = juz.segments.filter(
    (s) => !existing.some((e) => e.surah_number === s.surah && e.ayah_from <= s.startAyah && e.ayah_to >= s.endAyah),
  );
  if (fresh.length) {
    const rows = fresh.map((s) => ({
      surah_number: s.surah,
      ayah_from: s.startAyah,
      ayah_to: s.endAyah,
      status: status as string,
      rating: null,
      notes: `Juz ${juz.juzNumber} import`,
    }));
    await c.db.batch([insertItems(c, rows), syncReviewPool(c), logActivity(c, rows.length, 0)]);
  }
  return { success: true, added: fresh.length, skipped: juz.segments.length - fresh.length };
}
