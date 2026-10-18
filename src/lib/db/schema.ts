/**
 * PostgreSQL schema migrations (Supabase-compatible). Dependency-free so CLI scripts can import it.
 *
 * Security: every table lives in the private `kinoland` schema (not exposed by Supabase's Data API)
 * and has Row Level Security enabled with no policies, so the anon/authenticated API roles can read
 * nothing even if the schema were exposed. The app connects with the database owner role over the
 * server-side DATABASE_URL, which bypasses RLS.
 */
export const SCHEMA = "kinoland";

export const MIGRATIONS: { version: number; name: string; sql: string }[] = [
  {
    version: 1,
    name: "initial",
    sql: `
      CREATE TABLE IF NOT EXISTS kinoland.users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
        preferred_genres JSONB NOT NULL DEFAULT '[]'::jsonb,
        locale TEXT,
        created_at BIGINT NOT NULL,
        last_seen_at BIGINT
      );
      CREATE INDEX IF NOT EXISTS users_created_idx ON kinoland.users (created_at);

      CREATE TABLE IF NOT EXISTS kinoland.sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES kinoland.users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_user_idx ON kinoland.sessions (user_id);

      CREATE TABLE IF NOT EXISTS kinoland.list_items (
        user_id TEXT NOT NULL REFERENCES kinoland.users(id) ON DELETE CASCADE,
        list TEXT NOT NULL CHECK (list IN ('watchlist','favorite')),
        movie_id INTEGER NOT NULL,
        snapshot JSONB NOT NULL,
        added_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, list, movie_id)
      );

      CREATE TABLE IF NOT EXISTS kinoland.settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kinoland.events (
        id BIGSERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        visitor_hash TEXT,
        user_id TEXT,
        path TEXT,
        movie_id INTEGER,
        props JSONB
      );
      CREATE INDEX IF NOT EXISTS events_type_time_idx ON kinoland.events (type, created_at);
      CREATE INDEX IF NOT EXISTS events_movie_idx ON kinoland.events (movie_id, type);

      CREATE TABLE IF NOT EXISTS kinoland.daily_salts (
        day TEXT PRIMARY KEY,
        salt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kinoland.error_log (
        id BIGSERIAL PRIMARY KEY,
        created_at BIGINT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('server','client')),
        event TEXT NOT NULL,
        message TEXT,
        path TEXT
      );
      CREATE INDEX IF NOT EXISTS error_log_time_idx ON kinoland.error_log (created_at);

      CREATE TABLE IF NOT EXISTS kinoland.audit_log (
        id BIGSERIAL PRIMARY KEY,
        created_at BIGINT NOT NULL,
        actor_id TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details JSONB
      );
      CREATE INDEX IF NOT EXISTS audit_log_time_idx ON kinoland.audit_log (created_at);
      CREATE INDEX IF NOT EXISTS audit_log_target_idx ON kinoland.audit_log (target_id);

      CREATE TABLE IF NOT EXISTS kinoland.banners (
        id BIGSERIAL PRIMARY KEY,
        movie_id INTEGER NOT NULL,
        headline JSONB NOT NULL DEFAULT '{}'::jsonb,
        description JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        position INTEGER NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kinoland.hidden_movies (
        movie_id INTEGER PRIMARY KEY,
        reason TEXT,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kinoland.provider_links (
        id BIGSERIAL PRIMARY KEY,
        movie_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        url TEXT NOT NULL,
        region TEXT,
        created_at BIGINT NOT NULL,
        UNIQUE (movie_id, provider)
      );

      -- Login/registration throttling shared by all serverless instances.
      CREATE TABLE IF NOT EXISTS kinoland.rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at BIGINT NOT NULL
      );

      DO $$
      DECLARE t TEXT;
      BEGIN
        FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'kinoland' LOOP
          EXECUTE format('ALTER TABLE kinoland.%I ENABLE ROW LEVEL SECURITY', t);
        END LOOP;
      END $$;
    `,
  },
];
