import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "hifz-tracker.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
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
  `);
}
