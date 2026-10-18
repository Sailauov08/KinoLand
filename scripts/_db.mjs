// Shared DB connection for CLI scripts: DATABASE_URL (Supabase Postgres) or the embedded PGlite dev database.
import { MIGRATIONS, SCHEMA } from "../src/lib/db/schema.ts";

export async function connect() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {}, types: { bigint: { to: 20, from: [20], serialize: String, parse: Number } } });
    const wrap = (s) => ({
      query: (text, params = []) => s.unsafe(text, params),
      exec: (text) => s.unsafe(text).simple(),
      transaction: (fn) => (s.begin ? s.begin((tx) => fn(wrap(tx))) : fn(wrap(s))),
    });
    return { db: wrap(sql), target: "DATABASE_URL (PostgreSQL)", close: () => sql.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.EMBEDDED_DB_DIR?.trim() || "data/pglite";
  const pg = new PGlite(dir);
  await pg.waitReady;
  const wrap = (q, inTx) => ({
    query: async (text, params = []) => (await q.query(text, params)).rows,
    exec: (text) => q.exec(text),
    transaction: (fn) => (inTx ? fn(wrap(q, true)) : pg.transaction((tx) => fn(wrap(tx, true)))),
  });
  return { db: wrap(pg, false), target: `embedded PGlite (${dir})`, close: () => pg.close() };
}

export async function migrate(db) {
  await db.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await db.query(`CREATE TABLE IF NOT EXISTS ${SCHEMA}.schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at BIGINT NOT NULL)`);
  await db.query(`ALTER TABLE ${SCHEMA}.schema_migrations ENABLE ROW LEVEL SECURITY`);
  const applied = new Set((await db.query(`SELECT version FROM ${SCHEMA}.schema_migrations`)).map((r) => r.version));
  const ran = [];
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    await db.transaction(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(424242)");
      if ((await tx.query(`SELECT 1 FROM ${SCHEMA}.schema_migrations WHERE version = $1`, [m.version])).length) return;
      await tx.exec(m.sql);
      await tx.query(`INSERT INTO ${SCHEMA}.schema_migrations (version, name, applied_at) VALUES ($1, $2, $3)`, [m.version, m.name, Date.now()]);
      ran.push(`${m.version}_${m.name}`);
    });
  }
  return ran;
}
