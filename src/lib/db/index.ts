import "server-only";
import { env } from "@/lib/env";
import { MIGRATIONS, SCHEMA } from "./schema";

/**
 * Database access. Production uses PostgreSQL (Supabase) through `postgres` (postgres.js) with
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

async function createPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, {
    // Supabase's transaction pooler (port 6543) does not support prepared statements.
    prepare: false,
    max: env.isProduction ? 3 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    // BIGINT/COUNT come back as numbers (all values here stay far below 2^53).
    types: { bigint: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) } },
    onnotice: () => {},
  });
  // Minimal structural view of postgres.js (its generic typings are awkward to thread through).
  type Conn = {
    unsafe: (text: string, params?: unknown[]) => Promise<unknown> & { simple: () => Promise<unknown> };
    begin?: (fn: (tx: Conn) => Promise<unknown>) => Promise<unknown>;
  };
  const wrap = (s: Conn): Db => ({
    query: async <T,>(text: string, params: unknown[] = []) => (await s.unsafe(text, params)) as T[],
    exec: async (text: string) => {
      await s.unsafe(text).simple();
    },
    transaction: async <T,>(fn: (tx: Db) => Promise<T>) =>
      s.begin ? ((await s.begin((tx) => fn(wrap(tx)))) as T) : fn(wrap(s)), // nested: already in a transaction
  });
  return wrap(sql as unknown as Conn);
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
