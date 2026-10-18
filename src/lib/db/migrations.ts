import type { DatabaseSync } from "node:sqlite";

/** Ordered schema migrations; `PRAGMA user_version` records how many have run. */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    preferred_genres TEXT NOT NULL DEFAULT '[]',
    locale TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_user_idx ON sessions(user_id);

  CREATE TABLE list_items (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list TEXT NOT NULL CHECK (list IN ('watchlist','favorite')),
    movie_id INTEGER NOT NULL,
    snapshot TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, list, movie_id)
  );

  CREATE TABLE collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '{}',
    is_published INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE collection_items (
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    snapshot TEXT NOT NULL,
    PRIMARY KEY (collection_id, movie_id)
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

export function migrate(db: DatabaseSync) {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  const current = row.user_version;
  for (let i = current; i < MIGRATIONS.length; i++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}
