-- D1 schema. Apply: npx wrangler d1 execute hifz-tracker --remote --file schema.sql (--local for wrangler pages dev)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  pw_hash TEXT NOT NULL,                -- hex PBKDF2-SHA256, 100k iterations
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,          -- sha256 of the cookie value; the raw token is never stored
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS fails (      -- login/sign-up throttle; Workers keep no memory between requests
  key TEXT NOT NULL,
  t INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS fails_key ON fails(key, t);

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

CREATE INDEX IF NOT EXISTS idx_memo_user ON memorization_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_review_due ON review_items(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_review_item ON review_items(item_id);
