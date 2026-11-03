import { all, first, type Ctx } from "./db";
import { ayahCoverage, QURAN_AYAHS } from "../lib/juz-data";

export async function getDashboardStats(c: Ctx) {
  const { db, userId } = c;
  const [counts, ratingDistribution, due, learning, progressData, recentItems, allItems, activeDays] = await Promise.all([
    first<{ total: number; learned: number; learning: number; planned: number }>(
      db,
      `SELECT COUNT(*) AS total,
        COALESCE(SUM(status = 'learned'), 0) AS learned,
        COALESCE(SUM(status = 'learning'), 0) AS learning,
        COALESCE(SUM(status = 'planned'), 0) AS planned
       FROM memorization_items WHERE user_id = ?`,
      userId,
    ),
    all<{ rating: number; count: number }>(
      db,
      `SELECT rating, COUNT(*) AS count FROM memorization_items
       WHERE user_id = ? AND rating IS NOT NULL GROUP BY rating ORDER BY rating`,
      userId,
    ),
    first<{ count: number }>(
      db,
      `SELECT COUNT(*) AS count FROM review_items r JOIN memorization_items m ON r.item_id = m.id
       WHERE r.user_id = ? AND r.due_date <= ? AND r.in_review_pool = 1 AND m.status = 'learned'`,
      userId,
      c.today(),
    ),
    first<{ count: number }>(
      db,
      "SELECT COUNT(*) AS count FROM memorization_items WHERE user_id = ? AND status = 'learning'",
      userId,
    ),
    all<{ date: string; items_reviewed: number; items_added: number }>(
      db,
      "SELECT date, items_reviewed, items_added FROM daily_logs WHERE user_id = ? AND date >= ? ORDER BY date",
      userId,
      c.today(-29),
    ),
    all<{ id: number; surah_number: number; ayah_from: number; ayah_to: number; status: string; rating: number | null; updated_at: string }>(
      db,
      "SELECT * FROM memorization_items WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5",
      userId,
    ),
    all<Parameters<typeof ayahCoverage>[0][number]>(
      db,
      "SELECT surah_number, ayah_from, ayah_to, status FROM memorization_items WHERE user_id = ?",
      userId,
    ),
    all<{ date: string }>(
      db,
      "SELECT date FROM daily_logs WHERE user_id = ? AND (items_reviewed > 0 OR items_added > 0)",
      userId,
    ),
  ]);

  // A streak still counts if today isn't done yet but yesterday was.
  const active = new Set(activeDays.map((r) => r.date));
  let offset = active.has(c.today()) ? 0 : -1;
  let streak = 0;
  while (active.has(c.today(offset))) {
    streak++;
    offset--;
  }

  return {
    counts: counts ?? { total: 0, learned: 0, learning: 0, planned: 0 },
    coverage: { ...ayahCoverage(allItems), total: QURAN_AYAHS },
    ratingDistribution,
    reviewsDue: (due?.count ?? 0) + (learning?.count ?? 0),
    streak,
    progressData,
    recentItems,
  };
}
