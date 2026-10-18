// Usage: npm run db:import-sqlite -- [path/to/kino.db] [--include-test-accounts]
// Copies data from the previous local SQLite database (schema v2) into PostgreSQL / Supabase.
// Idempotent: existing rows are kept (ON CONFLICT DO NOTHING). Passwords stay as their existing
// scrypt hashes; nothing is printed except counts. Synthetic QA accounts (@kino.test,
// @kinoland.test) are skipped unless --include-test-accounts is passed.
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { connect, migrate } from "./_db.mjs";

const args = process.argv.slice(2);
const includeTest = args.includes("--include-test-accounts");
const file = args.find((a) => !a.startsWith("--")) ?? "data/kino.db";
if (!existsSync(file)) {
  console.error(`SQLite file not found: ${file}`);
  process.exit(1);
}

const lite = new DatabaseSync(file, { readOnly: true });
const version = lite.prepare("PRAGMA user_version").get().user_version;
if (version < 2) {
  console.error(`SQLite schema v${version} found; start the previous app version once to upgrade it to v2 first.`);
  process.exit(1);
}
const hasTable = (t) => !!lite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
const all = (sql) => lite.prepare(sql).all();
const json = (text, fallback) => {
  if (text == null) return fallback;
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return fallback;
  }
};
const isTest = (email) => /@(kino|kinoland)\.test$/i.test(email);

const { db, target, close } = await connect();
const counts = {};
const bump = (k, n = 1) => (counts[k] = (counts[k] ?? 0) + n);

try {
  await migrate(db);
  await db.transaction(async (tx) => {
    const users = all("SELECT * FROM users").filter((u) => includeTest || !isTest(u.email));
    const ids = new Set(users.map((u) => u.id));
    for (const u of users) {
      const r = await tx.query(
        `INSERT INTO kinoland.users (id, email, name, password_hash, role, status, preferred_genres, locale, created_at, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10) ON CONFLICT DO NOTHING RETURNING id`,
        [u.id, u.email, u.name, u.password_hash, u.role, u.status ?? "active", json(u.preferred_genres, "[]"), u.locale, u.created_at, u.last_seen_at ?? null],
      );
      if (r.length) bump("users");
    }
    for (const s of all("SELECT * FROM sessions")) {
      if (!ids.has(s.user_id) || s.expires_at < Date.now()) continue;
      const r = await tx.query("INSERT INTO kinoland.sessions (token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING token_hash", [s.token_hash, s.user_id, s.expires_at, s.created_at]);
      if (r.length) bump("sessions");
    }
    for (const li of all("SELECT * FROM list_items")) {
      if (!ids.has(li.user_id)) continue;
      const r = await tx.query(
        "INSERT INTO kinoland.list_items (user_id, list, movie_id, snapshot, added_at) VALUES ($1, $2, $3, $4::jsonb, $5) ON CONFLICT DO NOTHING RETURNING movie_id",
        [li.user_id, li.list, li.movie_id, json(li.snapshot, "{}"), li.added_at],
      );
      if (r.length) bump("list_items");
    }
    for (const s of all("SELECT * FROM settings WHERE key IN ('display', 'analytics_retention_days')")) {
      const r = await tx.query("INSERT INTO kinoland.settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT DO NOTHING RETURNING key", [s.key, json(s.value, "null")]);
      if (r.length) bump("settings");
    }
    // Content and logs are only copied into an empty target, so re-running never duplicates them.
    const empty = async (t) => (await tx.query(`SELECT 1 FROM kinoland.${t} LIMIT 1`)).length === 0;
    if (hasTable("banners") && (await empty("banners"))) {
      for (const b of all("SELECT * FROM banners ORDER BY id")) {
        await tx.query(
          "INSERT INTO kinoland.banners (movie_id, headline, description, is_active, position, created_at, updated_at) VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7)",
          [b.movie_id, json(b.headline, "{}"), json(b.description, "{}"), !!b.is_active, b.position, b.created_at, b.updated_at],
        );
        bump("banners");
      }
    }
    if (hasTable("hidden_movies")) {
      for (const h of all("SELECT * FROM hidden_movies")) {
        const r = await tx.query("INSERT INTO kinoland.hidden_movies (movie_id, reason, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING movie_id", [h.movie_id, h.reason, h.created_at]);
        if (r.length) bump("hidden_movies");
      }
    }
    if (hasTable("provider_links")) {
      for (const p of all("SELECT * FROM provider_links")) {
        const r = await tx.query(
          "INSERT INTO kinoland.provider_links (movie_id, provider, url, region, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING id",
          [p.movie_id, p.provider, p.url, p.region, p.created_at],
        );
        if (r.length) bump("provider_links");
      }
    }
    if (hasTable("events") && (await empty("events"))) {
      for (const e of all("SELECT * FROM events ORDER BY id")) {
        await tx.query("INSERT INTO kinoland.events (type, created_at, visitor_hash, user_id, path, movie_id, props) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)", [
          e.type,
          e.created_at,
          e.visitor_hash,
          e.user_id && ids.has(e.user_id) ? e.user_id : null,
          e.path,
          e.movie_id,
          json(e.props, null),
        ]);
        bump("events");
      }
    }
    if (hasTable("audit_log") && (await empty("audit_log"))) {
      for (const a of all("SELECT * FROM audit_log ORDER BY id")) {
        await tx.query("INSERT INTO kinoland.audit_log (created_at, actor_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5, $6::jsonb)", [
          a.created_at,
          a.actor_id && ids.has(a.actor_id) ? a.actor_id : null,
          a.action,
          a.target_type,
          a.target_id,
          json(a.details, null),
        ]);
        bump("audit_log");
      }
    }
    if (hasTable("error_log") && (await empty("error_log"))) {
      for (const e of all("SELECT * FROM error_log ORDER BY id")) {
        await tx.query("INSERT INTO kinoland.error_log (created_at, source, event, message, path) VALUES ($1, $2, $3, $4, $5)", [e.created_at, e.source, e.event, e.message, e.path]);
        bump("error_log");
      }
    }
  });
  console.log(`Imported from ${file} into ${target}:`);
  console.table(counts);
  if (!includeTest) console.log("Synthetic test accounts (@kino.test / @kinoland.test) were skipped.");
} finally {
  await close();
  lite.close();
}
