import "server-only";
import { getDb } from "./index";

export interface ErrorEntry {
  id: number;
  createdAt: number;
  source: "server" | "client";
  event: string;
  message: string | null;
  path: string | null;
}

const clip = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null);

export function recordError(e: { source: "server" | "client"; event: string; message?: string | null; path?: string | null }) {
  try {
    getDb()
      .prepare("INSERT INTO error_log (created_at, source, event, message, path) VALUES (?, ?, ?, ?, ?)")
      .run(Date.now(), e.source, e.event.slice(0, 80), clip(e.message, 500), clip(e.path, 200));
  } catch {
    // Error logging must never break the request that triggered it.
  }
}

export function recentErrors(limit = 10): ErrorEntry[] {
  const rows = getDb().prepare("SELECT * FROM error_log ORDER BY id DESC LIMIT ?").all(limit) as unknown as {
    id: number;
    created_at: number;
    source: "server" | "client";
    event: string;
    message: string | null;
    path: string | null;
  }[];
  return rows.map((r) => ({ id: r.id, createdAt: r.created_at, source: r.source, event: r.event, message: r.message, path: r.path }));
}

export function errorsByDay(from: number): { day: string; server: number; client: number }[] {
  return getDb()
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch', 'localtime') AS day,
              SUM(CASE WHEN source = 'server' THEN 1 ELSE 0 END) AS server,
              SUM(CASE WHEN source = 'client' THEN 1 ELSE 0 END) AS client
       FROM error_log WHERE created_at >= ? GROUP BY day ORDER BY day`,
    )
    .all(from) as unknown as { day: string; server: number; client: number }[];
}

export function countErrorsSince(from: number): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM error_log WHERE created_at >= ?").get(from) as { n: number }).n;
}

export const countErrorsLast24h = () => countErrorsSince(Date.now() - 86_400_000);
