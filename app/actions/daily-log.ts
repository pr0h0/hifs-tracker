"use server";

import { getDb } from "@/lib/db";
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

  const today = new Date().toISOString().split("T")[0];
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
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const progressData = db
    .prepare(
      `SELECT date, items_reviewed, items_added
       FROM daily_logs
       WHERE user_id = ? AND date >= ?
       ORDER BY date`,
    )
    .all(user.id, thirtyDaysAgo.toISOString().split("T")[0]) as Array<{
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

  return {
    counts,
    ratingDistribution,
    reviewsDue: dueCount.count + learningCount.count,
    streak,
    progressData,
    recentItems,
  };
}

function calculateStreak(db: ReturnType<typeof getDb>, userId: number): number {
  const logs = db
    .prepare(
      `SELECT date FROM daily_logs
       WHERE user_id = ? AND (items_reviewed > 0 OR items_added > 0)
       ORDER BY date DESC`,
    )
    .all(userId) as Array<{ date: string }>;

  if (logs.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < logs.length; i++) {
    const logDate = new Date(logs[i].date + "T00:00:00");
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    expectedDate.setHours(0, 0, 0, 0);

    if (logDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else if (i === 0 && streak === 0) {
      // Allow checking from yesterday if today hasn't been logged yet
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (logDate.getTime() === yesterday.getTime()) {
        streak++;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return streak;
}
