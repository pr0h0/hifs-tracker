// D1 helpers shared by the API handlers. D1 has no interactive transactions, so
// multi-step writes go through db.batch() (one implicit transaction) and avoid
// read-then-write logic; bulk rows travel as one JSON parameter (D1 caps a query at 100).

export interface D1Stmt {
  bind(...v: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
}
export interface D1 {
  prepare(sql: string): D1Stmt;
  batch(stmts: D1Stmt[]): Promise<{ meta: { changes: number; last_row_id: number } }[]>;
}

/** Per-request context: the signed-in user and their local calendar. */
export interface Ctx {
  db: D1;
  userId: number;
  /** User's local date as YYYY-MM-DD, offset by whole days. */
  today: (offsetDays?: number) => string;
}

/** Workers run in UTC; the browser sends its offset so "today" and streaks follow the user's day. */
export function localDateFn(tzOffsetMinutes: number) {
  const tz = Math.max(-840, Math.min(840, Math.trunc(tzOffsetMinutes) || 0));
  return (offsetDays = 0) =>
    new Date(Date.now() + tz * 60_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export const q = (db: D1, sql: string, ...p: unknown[]) => db.prepare(sql).bind(...p);
export const all = async <T>(db: D1, sql: string, ...p: unknown[]) => (await q(db, sql, ...p).all<T>()).results;
export const first = <T>(db: D1, sql: string, ...p: unknown[]) => q(db, sql, ...p).first<T>();

/** Every learned item gets an SM-2 entry (no-op for ones that have it). */
export const syncReviewPool = (c: Ctx) =>
  q(
    c.db,
    `INSERT INTO review_items (user_id, item_id, interval, repetition, efactor, due_date, in_review_pool)
     SELECT m.user_id, m.id, 1, 0, 2.5, ?, 1 FROM memorization_items m
     WHERE m.user_id = ? AND m.status = 'learned'
       AND NOT EXISTS (SELECT 1 FROM review_items r WHERE r.item_id = m.id)`,
    c.today(),
    c.userId,
  );

/** Items moved out of "learned" leave the SM-2 pool. */
export const dropUnlearnedReviews = (c: Ctx) =>
  q(
    c.db,
    `DELETE FROM review_items WHERE user_id = ?
       AND item_id IN (SELECT id FROM memorization_items WHERE user_id = ? AND status != 'learned')`,
    c.userId,
    c.userId,
  );

export const logActivity = (c: Ctx, added: number, reviewed: number) =>
  q(
    c.db,
    `INSERT INTO daily_logs (user_id, date, items_added, items_reviewed) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
       items_added = items_added + excluded.items_added,
       items_reviewed = items_reviewed + excluded.items_reviewed`,
    c.userId,
    c.today(),
    added,
    reviewed,
  );

export interface NewItem {
  surah_number: number;
  ayah_from: number;
  ayah_to: number;
  status: string;
  rating: number | null;
  notes: string;
}

/** Inserts any number of items in one statement; ids are assigned in array order. */
export const insertItems = (c: Ctx, items: NewItem[]) =>
  q(
    c.db,
    `INSERT INTO memorization_items (user_id, surah_number, ayah_from, ayah_to, status, rating, notes)
     SELECT ?, json_extract(value, '$.surah_number'), json_extract(value, '$.ayah_from'),
            json_extract(value, '$.ayah_to'), json_extract(value, '$.status'),
            json_extract(value, '$.rating'), json_extract(value, '$.notes')
     FROM json_each(?) ORDER BY key`,
    c.userId,
    JSON.stringify(items),
  );
