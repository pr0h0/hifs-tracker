import { all, first, logActivity, q, syncReviewPool, type Ctx } from "./db";
import { calculateSM2, getTargetQueueSize, type ReviewQueueItem } from "../lib/sm2";
import { juzSqlFilter } from "../lib/juz-data";

type Row = Omit<ReviewQueueItem, "source">;

const REVIEW_COLS = `r.id, r.item_id, r.interval, r.repetition, r.efactor, r.due_date,
  m.surah_number, m.ayah_from, m.ayah_to, m.status, m.rating, m.notes`;

export async function getDailyReviewQueue(
  c: Ctx,
  includeLearning = true,
  includeLearned = true,
  limitArg?: unknown,
  juzArg?: unknown,
): Promise<ReviewQueueItem[]> {
  const limit = Number.isInteger(limitArg) ? Math.min(Math.max(limitArg as number, 1), 100) : undefined;
  const juz = Number.isInteger(juzArg) && (juzArg as number) >= 1 && (juzArg as number) <= 30 ? (juzArg as number) : undefined;
  // Juz review only includes items that actually overlap that juz's ayahs.
  const { sql: juzFilter, params: juzParams } = juz ? juzSqlFilter(juz) : { sql: "", params: [] as string[] };

  const queue: ReviewQueueItem[] = [];

  // Tier 1: "learning" items (repeat daily, no SM-2)
  if (includeLearning) {
    const learning = await all<Row>(
      c.db,
      `SELECT 0 AS id, m.id AS item_id, m.surah_number, m.ayah_from, m.ayah_to, m.status, m.rating, m.notes
       FROM memorization_items m
       WHERE m.user_id = ? AND m.status = 'learning'${juzFilter}
       ORDER BY m.surah_number, m.ayah_from`,
      c.userId,
      ...juzParams,
    );
    queue.push(...learning.map((r) => ({ ...r, source: "learning" as const })));
  }

  if (!includeLearned) return limit ? queue.slice(0, limit) : queue;

  const targetSize = limit || getTargetQueueSize(queue);

  // Tier 2: SM-2 items due today or overdue
  if (queue.length < targetSize) {
    const due = await all<Row>(
      c.db,
      `SELECT ${REVIEW_COLS}
       FROM review_items r JOIN memorization_items m ON r.item_id = m.id
       WHERE r.user_id = ? AND r.in_review_pool = 1 AND r.due_date <= ? AND m.status = 'learned'${juzFilter}
       ORDER BY r.due_date ASC
       LIMIT ?`,
      c.userId,
      c.today(),
      ...juzParams,
      targetSize - queue.length,
    );
    queue.push(...due.map((r) => ({ ...r, source: "due" as const })));
  }

  // Tier 3: random fill from learned items (even if not due)
  if (queue.length < targetSize) {
    const random = await all<Row>(
      c.db,
      `SELECT ${REVIEW_COLS}
       FROM review_items r JOIN memorization_items m ON r.item_id = m.id
       WHERE r.user_id = ? AND r.in_review_pool = 1 AND m.status = 'learned'${juzFilter}
         AND r.item_id NOT IN (SELECT value FROM json_each(?))
       ORDER BY RANDOM()
       LIMIT ?`,
      c.userId,
      ...juzParams,
      JSON.stringify(queue.map((x) => x.item_id)),
      targetSize - queue.length,
    );
    queue.push(...random.map((r) => ({ ...r, source: "random" as const })));
  }

  return queue;
}

export async function submitReview(c: Ctx, itemIdArg: unknown, quality: unknown) {
  const itemId = Number(itemIdArg);
  if (!Number.isInteger(quality) || (quality as number) < 1 || (quality as number) > 5) return { error: "Invalid rating" };
  const rating = quality as number;

  const item = await first<{ status: string; rid: number | null; interval: number; repetition: number; efactor: number }>(
    c.db,
    `SELECT m.status, r.id AS rid, r.interval, r.repetition, r.efactor
     FROM memorization_items m LEFT JOIN review_items r ON r.item_id = m.id
     WHERE m.id = ? AND m.user_id = ?`,
    itemId,
    c.userId,
  );
  if (!item) return { error: "Item not found" };

  const writes = [
    q(c.db, "UPDATE memorization_items SET rating = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?", rating, itemId, c.userId),
    logActivity(c, 0, 1),
  ];
  // Learned items get rescheduled by SM-2.
  if (item.status === "learned" && item.rid) {
    const r = calculateSM2(rating, item.interval, item.repetition, item.efactor);
    writes.push(
      q(
        c.db,
        "UPDATE review_items SET interval = ?, repetition = ?, efactor = ?, due_date = ?, last_reviewed = ? WHERE id = ?",
        r.interval, r.repetition, r.efactor, c.today(r.interval), c.today(), item.rid,
      ),
    );
  }
  await c.db.batch(writes);
  return { success: true, suggestPromote: item.status === "learning" && rating >= 4 };
}

export async function promoteToLearned(c: Ctx, itemId: unknown) {
  await c.db.batch([
    q(
      c.db,
      "UPDATE memorization_items SET status = 'learned', updated_at = datetime('now') WHERE id = ? AND user_id = ?",
      Number(itemId),
      c.userId,
    ),
    syncReviewPool(c),
  ]);
  return { success: true };
}
