"use server";

import { getDb, localDate, type Db } from "@/lib/db";
import { ayahCoverage, QURAN_AYAHS } from "@/lib/juz-data";
import { requireAuth } from "@/lib/auth";

export async function getDashboardStats() {
  const user = await requireAuth();
  const db = getDb();

  const counts = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'learned' THEN 1 ELSE 0 END) as learned,
        SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) as learning,
        SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned
       FROM memorization_items WHERE user_id = ?`,
    )
    .get(user.id) as {
    total: number;
    learned: number;
    learning: number;
    planned: number;
  };

  const ratingDistribution = db
    .prepare(
      `SELECT rating, COUNT(*) as count
       FROM memorization_items
       WHERE user_id = ? AND rating IS NOT NULL
       GROUP BY rating ORDER BY rating`,
    )
    .all(user.id) as Array<{ rating: number; count: number }>;

  const today = localDate();
  const dueCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM review_items r
       JOIN memorization_items m ON r.item_id = m.id
       WHERE r.user_id = ? AND r.due_date <= ? AND r.in_review_pool = 1 AND m.status = 'learned'`,
    )
    .get(user.id, today) as { count: number };

  const learningCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM memorization_items WHERE user_id = ? AND status = 'learning'",
    )
    .get(user.id) as { count: number };

  // Calculate streak
  const streak = calculateStreak(db, user.id);

  // Progress over last 30 days

  const progressData = db
    .prepare(
      `SELECT date, items_reviewed, items_added
       FROM daily_logs
       WHERE user_id = ? AND date >= ?
       ORDER BY date`,
    )
    .all(user.id, localDate(-29)) as unknown as Array<{
    date: string;
    items_reviewed: number;
    items_added: number;
  }>;

  // Recent activity
  const recentItems = db
    .prepare(
      `SELECT * FROM memorization_items
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 5`,
    )
    .all(user.id) as Array<{
    id: number;
    surah_number: number;
    ayah_from: number;
    ayah_to: number;
    status: string;
    rating: number | null;
    updated_at: string;
  }>;

  const allItems = db
    .prepare("SELECT surah_number, ayah_from, ayah_to, status FROM memorization_items WHERE user_id = ?")
    .all(user.id) as unknown as Parameters<typeof ayahCoverage>[0];
  const coverage = { ...ayahCoverage(allItems), total: QURAN_AYAHS };

  return {
    counts,
    coverage,
    ratingDistribution,
    reviewsDue: dueCount.count + learningCount.count,
    streak,
    progressData,
    recentItems,
  };
}

function calculateStreak(db: Db, userId: number): number {
  const active = new Set(
    (
      db
        .prepare(
          `SELECT date FROM daily_logs
           WHERE user_id = ? AND (items_reviewed > 0 OR items_added > 0)`,
        )
        .all(userId) as Array<{ date: string }>
    ).map((r) => r.date),
  );
  // A streak still counts if today isn't done yet but yesterday was.
  let offset = active.has(localDate()) ? 0 : -1;
  let streak = 0;
  while (active.has(localDate(offset))) {
    streak++;
    offset--;
  }
  return streak;
}
