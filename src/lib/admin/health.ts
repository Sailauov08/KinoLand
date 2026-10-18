import "server-only";
import { getDb } from "@/lib/db";
import { env, isPosthogConfigured, isPosthogQueryConfigured, isTmdbConfigured } from "@/lib/env";
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

/** Safe database check: connectivity, schema version, row counts. Never returns paths or secrets. */
export function databaseHealth(): DbHealth {
  const started = performance.now();
  try {
    const db = getDb();
    db.prepare("SELECT 1").get();
    const schemaVersion = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
    const sqliteVersion = (db.prepare("SELECT sqlite_version() AS v").get() as { v: string }).v;
    const rows: Record<string, number> = {};
    for (const t of ["users", "sessions", "list_items", "events", "error_log", "audit_log", "banners"]) {
      rows[t] = (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
    }
    const pages = db.prepare("PRAGMA page_count").get() as { page_count: number };
    const pageSize = db.prepare("PRAGMA page_size").get() as { page_size: number };
    const sizeBytes = pages.page_count * pageSize.page_size;
    return { ok: true, latencyMs: Math.round(performance.now() - started), engine: `SQLite ${sqliteVersion} (node:sqlite)`, schemaVersion, sizeBytes, rows };
  } catch (err) {
    return { ok: false, latencyMs: Math.round(performance.now() - started), engine: "SQLite", schemaVersion: 0, sizeBytes: null, rows: {}, error: err instanceof Error ? err.name : "Error" };
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
export function integrationStatus() {
  return [
    { name: "TMDB_READ_ACCESS_TOKEN / TMDB_API_KEY", configured: isTmdbConfigured() },
    { name: "POSTHOG_PROJECT_API_KEY", configured: isPosthogConfigured() },
    { name: "POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID", configured: isPosthogQueryConfigured() },
    { name: "NEXT_PUBLIC_SITE_URL", configured: Boolean(process.env.NEXT_PUBLIC_SITE_URL) },
    { name: "DATABASE_PATH", configured: Boolean(env.databasePath), optional: true },
  ];
}
