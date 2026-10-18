// Shared DB connection for CLI scripts: DATABASE_URL (Supabase Postgres) or the embedded PGlite dev database.
import { MIGRATIONS, SCHEMA } from "../src/lib/db/schema.ts";

export async function connect() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const pg = (await import("pg")).default;
    pg.types.setTypeParser(20, (v) => Number(v));
    const u = new URL(url);
    const wantsSsl = u.searchParams.get("sslmode") !== "disable";
    for (const p of ["sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"]) u.searchParams.delete(p);
    const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
    const client = new pg.Client({ connectionString: u.toString(), ssl: wantsSsl ? (ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false }) : false });
    await client.connect();
    let inTx = false;
    const db = {
      query: async (text, params = []) => (await client.query(text, params)).rows,
      exec: async (text) => {
        await client.query(text);
      },
      transaction: async (fn) => {
        if (inTx) return fn(db);
        inTx = true;
        await client.query("BEGIN");
        try {
          const r = await fn(db);
          await client.query("COMMIT");
          return r;
        } catch (e) {
          await client.query("ROLLBACK").catch(() => {});
          throw e;
        } finally {
          inTx = false;
        }
      },
    };
    return { db, target: "DATABASE_URL (PostgreSQL)", close: () => client.end() };
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
