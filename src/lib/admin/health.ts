import "server-only";
import { count, one, q } from "@/lib/db";
import { env, isDatabaseConfigured, isPosthogConfigured, isPosthogQueryConfigured, isTmdbConfigured } from "@/lib/env";
import { tmdbFetch } from "@/lib/movies/tmdb";

export interface DbHealth {
  ok: boolean;
  latencyMs: number;
  engine: string;
  schemaVersion: number;
  sizeBytes: number | null;
  rows: Record<string, number>;
  error?: string;
}

/** Safe database check: connectivity, server version, schema version, row counts. Never returns URLs or secrets. */
export async function databaseHealth(): Promise<DbHealth> {
  const started = performance.now();
  try {
    await q("SELECT 1");
    const version = await one<{ v: string }>("SELECT current_setting('server_version') AS v");
    const schemaVersion = Number((await one<{ v: number }>("SELECT COALESCE(MAX(version), 0)::int AS v FROM kinoland.schema_migrations"))?.v ?? 0);
    const rows: Record<string, number> = {};
    for (const t of ["users", "sessions", "list_items", "events", "error_log", "audit_log", "banners"]) {
      rows[t] = await count(`SELECT COUNT(*)::int AS n FROM kinoland.${t}`);
    }
    const size = await one<{ n: number }>("SELECT COALESCE(SUM(pg_total_relation_size(c.oid)), 0)::bigint AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'kinoland' AND c.relkind = 'r'");
    return {
      ok: true,
      latencyMs: Math.round(performance.now() - started),
      engine: `PostgreSQL ${version?.v ?? ""} (${isDatabaseConfigured() ? "Supabase / DATABASE_URL" : "embedded PGlite"})`,
      schemaVersion,
      sizeBytes: Number(size?.n ?? 0),
      rows,
    };
  } catch (err) {
    return { ok: false, latencyMs: Math.round(performance.now() - started), engine: "PostgreSQL", schemaVersion: 0, sizeBytes: null, rows: {}, error: err instanceof Error ? err.name : "Error" };
  }
}

let tmdbCache: { at: number; value: { ok: boolean | null; latencyMs: number | null; status: number | null } } | null = null;

/** Lightweight TMDB probe (/configuration), cached for 60 s so the page can't hammer the API. */
export async function tmdbHealth() {
  if (!isTmdbConfigured()) return { ok: null, latencyMs: null, status: null };
  if (tmdbCache && Date.now() - tmdbCache.at < 60_000) return tmdbCache.value;
  const started = performance.now();
  let value;
  try {
    await tmdbFetch("/configuration", {}, 0);
    value = { ok: true, latencyMs: Math.round(performance.now() - started), status: 200 };
  } catch (err) {
    const status = err && typeof err === "object" && "status" in err ? (err.status as number | null) : null;
    value = { ok: false, latencyMs: Math.round(performance.now() - started), status };
  }
  tmdbCache = { at: Date.now(), value };
  return value;
}

export function serverHealth() {
  const mem = process.memoryUsage();
  return { uptimeSec: Math.round(process.uptime()), rssBytes: mem.rss, node: process.version, mode: env.isProduction ? "production" : "development" };
}

/** Configuration presence by variable NAME only. */
export function integrationStatus(): { name: string; configured: boolean; optional?: boolean }[] {
  return [
    { name: "TMDB_READ_ACCESS_TOKEN / TMDB_API_KEY", configured: isTmdbConfigured() },
    { name: "POSTHOG_PROJECT_API_KEY", configured: isPosthogConfigured() },
    { name: "POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID", configured: isPosthogQueryConfigured() },
    { name: "NEXT_PUBLIC_SITE_URL", configured: Boolean(process.env.NEXT_PUBLIC_SITE_URL) },
    { name: "DATABASE_URL", configured: isDatabaseConfigured() },
  ];
}
