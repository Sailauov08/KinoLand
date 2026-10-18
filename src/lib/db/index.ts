import "server-only";
import { env } from "@/lib/env";
import { MIGRATIONS, SCHEMA } from "./schema";

/**
 * Database access. Production uses PostgreSQL (Supabase) through node-postgres (`pg`) with
 * DATABASE_URL. Without DATABASE_URL — local development and tests — an embedded PGlite database
 * (real Postgres compiled to WASM) is used, so the same SQL runs everywhere.
 */
export type Row = Record<string, unknown>;

export interface Db {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  /** Runs a multi-statement script without parameters (simple query protocol), e.g. migrations. */
  exec(text: string): Promise<void>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

type Global = { kinolandDb?: Promise<Db> };
const g = globalThis as unknown as Global;

/**
 * TLS options for node-postgres. The connection is always encrypted; the server certificate is
 * verified when DATABASE_CA_CERT (Supabase → Database settings → SSL certificate) is provided,
 * otherwise it behaves like libpq's sslmode=require (encrypt without verification).
 */
export function pgConnectionConfig(url: string, caCert?: string) {
  const u = new URL(url);
  const wantsSsl = u.searchParams.has("sslmode") ? u.searchParams.get("sslmode") !== "disable" : !/^(localhost|127\.0\.0\.1)$/.test(u.hostname);
  for (const p of ["sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"]) u.searchParams.delete(p);
  return {
    connectionString: u.toString(),
    ssl: wantsSsl ? (caCert ? { ca: caCert, rejectUnauthorized: true } : { rejectUnauthorized: false }) : false,
  };
}

async function createPostgres(url: string): Promise<Db> {
  // node-postgres runs one query per connection at a time (no pipelining), which is what
  // Supabase's transaction pooler (Supavisor, port 6543) requires.
  const pg = await import("pg");
  pg.types.setTypeParser(20, (v: string) => Number(v)); // BIGINT/COUNT → number (values stay < 2^53)
  const pool = new pg.Pool({
    ...pgConnectionConfig(url, env.databaseCaCert),
    max: env.isProduction ? 3 : 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
  });
  pool.on("error", () => {}); // idle-client errors are surfaced on the next query instead of crashing

  type Client = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };
  const wrap = (c: Client, inTx: boolean): Db => ({
    query: async <T,>(text: string, params: unknown[] = []) => (await c.query(text, params)).rows as T[],
    // Without parameters node-postgres uses the simple protocol, which allows multiple statements.
    exec: async (text: string) => {
      await c.query(text);
    },
    transaction: async <T,>(fn: (tx: Db) => Promise<T>): Promise<T> => {
      if (inTx) return fn(wrap(c, true));
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(wrap(client, true));
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
  });
  return wrap(pool, false);
}

async function createPglite(dataDir: string | undefined): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await pg.waitReady;
  type Q = Pick<typeof pg, "query" | "exec">;
  const wrap = (q: Q, inTx: boolean): Db => ({
    query: async <T,>(text: string, params: unknown[] = []) => (await q.query<T>(text, params)).rows,
    exec: async (text: string) => {
      await q.exec(text);
    },
    transaction: async (fn) => (inTx ? fn(wrap(q, true)) : pg.transaction((tx) => fn(wrap(tx, true)))),
  });
  return wrap(pg, false);
}

/** Applies pending migrations under an advisory lock (safe with concurrent serverless cold starts). */
export async function migrate(db: Db) {
  await db.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await db.query(`CREATE TABLE IF NOT EXISTS ${SCHEMA}.schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at BIGINT NOT NULL)`);
  await db.query(`ALTER TABLE ${SCHEMA}.schema_migrations ENABLE ROW LEVEL SECURITY`);
  const applied = new Set((await db.query<{ version: number }>(`SELECT version FROM ${SCHEMA}.schema_migrations`)).map((r) => r.version));
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    await db.transaction(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(424242)");
      const done = await tx.query(`SELECT 1 FROM ${SCHEMA}.schema_migrations WHERE version = $1`, [m.version]);
      if (done.length) return;
      await tx.exec(m.sql);
      await tx.query(`INSERT INTO ${SCHEMA}.schema_migrations (version, name, applied_at) VALUES ($1, $2, $3)`, [m.version, m.name, Date.now()]);
    });
  }
}

async function open(): Promise<Db> {
  let db: Db;
  if (env.databaseUrl) {
    db = await createPostgres(env.databaseUrl);
  } else {
    if (env.isProduction && !env.allowEmbeddedDb) {
      throw new Error("DATABASE_URL is not set. Configure your Supabase Postgres connection string.");
    }
    db = await createPglite(env.embeddedDbDir);
  }
  await migrate(db);
  return db;
}

/** Process-wide database handle (reused across requests and dev hot reloads). */
export function getDb(): Promise<Db> {
  if (!g.kinolandDb) {
    g.kinolandDb = open().catch((err) => {
      g.kinolandDb = undefined; // allow a retry on the next request
      throw err;
    });
  }
  return g.kinolandDb;
}

/** Convenience helpers. */
export async function q<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await getDb()).query<T>(text, params);
}

export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | undefined> {
  return (await q<T>(text, params))[0];
}

export async function count(text: string, params: unknown[] = []): Promise<number> {
  const row = await one<{ n: number | string }>(text, params);
  return Number(row?.n ?? 0);
}
