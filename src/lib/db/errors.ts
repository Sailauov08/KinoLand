import "server-only";
import { env } from "@/lib/env";
import { count, q } from "./index";
import { DAY_SQL } from "./users";

export interface ErrorEntry {
  id: number;
  createdAt: number;
  source: "server" | "client";
  event: string;
  message: string | null;
  path: string | null;
}

const clip = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null);

export async function recordError(e: { source: "server" | "client"; event: string; message?: string | null; path?: string | null }) {
  try {
    await q("INSERT INTO kinoland.error_log (created_at, source, event, message, path) VALUES ($1, $2, $3, $4, $5)", [
      Date.now(),
      e.source,
      e.event.slice(0, 80),
      clip(e.message, 500),
      clip(e.path, 200),
    ]);
  } catch {
    // Error logging must never break the request that triggered it.
  }
}

export async function recentErrors(limit = 10): Promise<ErrorEntry[]> {
  const rows = await q<{ id: number; created_at: number; source: "server" | "client"; event: string; message: string | null; path: string | null }>(
    "SELECT * FROM kinoland.error_log ORDER BY id DESC LIMIT $1",
    [limit],
  );
  return rows.map((r) => ({ id: Number(r.id), createdAt: Number(r.created_at), source: r.source, event: r.event, message: r.message, path: r.path }));
}

export function errorsByDay(from: number): Promise<{ day: string; server: number; client: number }[]> {
  return q(
    `SELECT ${DAY_SQL("created_at", "$2")} AS day,
            COUNT(*) FILTER (WHERE source = 'server')::int AS server,
            COUNT(*) FILTER (WHERE source = 'client')::int AS client
     FROM kinoland.error_log WHERE created_at >= $1 GROUP BY day ORDER BY day`,
    [from, env.appTimezone],
  );
}

export const countErrorsSince = (from: number) => count("SELECT COUNT(*)::int AS n FROM kinoland.error_log WHERE created_at >= $1", [from]);
export const countErrorsLast24h = () => countErrorsSince(Date.now() - 86_400_000);
