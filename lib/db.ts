import { DatabaseSync } from "node:sqlite";
import path from "path";

const DB_PATH = path.join(process.cwd(), "hifz-tracker.db");

type Param = null | number | bigint | string;

/**
 * Thin wrapper over node:sqlite. Rows are copied into plain objects because
 * node:sqlite returns null-prototype rows, which React can't pass to client components.
 */
function wrap(raw: DatabaseSync) {
  return {
    exec: (sql: string) => raw.exec(sql),
    prepare(sql: string) {
      const st = raw.prepare(sql);
      return {
        run: (...p: Param[]) => st.run(...p),
        get: (...p: Param[]) => {
          const row = st.get(...p);
          return row ? { ...row } : undefined;
        },
        all: (...p: Param[]) => st.all(...p).map((r) => ({ ...r })),
      };
    },
  };
}

export type Db = ReturnType<typeof wrap>;

// Survive dev hot-reloads without opening a new connection each time.
const globalForDb = globalThis as unknown as { hifzDb?: Db };

export function getDb(): Db {
  if (!globalForDb.hifzDb) {
    const raw = new DatabaseSync(DB_PATH);
    raw.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    initializeDb(raw);
    globalForDb.hifzDb = wrap(raw);
  }
  return globalForDb.hifzDb;
}

/** Runs fn inside a transaction; rolls back if it throws. */
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/** Local calendar date as YYYY-MM-DD (toISOString() would give the UTC date). */
export function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function initializeDb(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memorization_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      surah_number INTEGER NOT NULL,
      ayah_from INTEGER NOT NULL,
      ayah_to INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('learned', 'learning', 'planned')),
      rating INTEGER DEFAULT NULL CHECK(rating IS NULL OR (rating >= 1 AND rating <= 5)),
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS review_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES memorization_items(id) ON DELETE CASCADE,
      interval REAL NOT NULL DEFAULT 1,
      repetition INTEGER NOT NULL DEFAULT 0,
      efactor REAL NOT NULL DEFAULT 2.5,
      due_date TEXT NOT NULL,
      last_reviewed TEXT,
      in_review_pool INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      items_reviewed INTEGER NOT NULL DEFAULT 0,
      items_added INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      UNIQUE(user_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_memo_user ON memorization_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_memo_status ON memorization_items(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_review_user ON review_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_review_due ON review_items(user_id, due_date);
    CREATE INDEX IF NOT EXISTS idx_daily_user ON daily_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_review_item ON review_items(item_id);

    DELETE FROM sessions WHERE expires_at <= datetime('now');
  `);
}

/** Puts a learned item into the SM-2 review pool (no-op if already there). */
export function ensureReviewEntry(userId: number, itemId: number | bigint) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM review_items WHERE item_id = ? AND user_id = ?")
    .get(itemId, userId);
  if (!existing) {
    db.prepare(
      `INSERT INTO review_items (user_id, item_id, interval, repetition, efactor, due_date, in_review_pool)
       VALUES (?, ?, 1, 0, 2.5, ?, 1)`,
    ).run(userId, itemId, localDate());
  }
}

export function logActivity(userId: number, added: number, reviewed: number) {
  getDb()
    .prepare(
      `INSERT INTO daily_logs (user_id, date, items_added, items_reviewed)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET
         items_added = items_added + excluded.items_added,
         items_reviewed = items_reviewed + excluded.items_reviewed`,
    )
    .run(userId, localDate(), added, reviewed);
}
