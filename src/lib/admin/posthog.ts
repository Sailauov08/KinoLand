import "server-only";
import { env, isPosthogQueryConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";

let cache: { key: string; at: number; value: { day: string; value: number }[] } | null = null;

/**
 * Daily pageviews from PostHog via the private Query API (server-side only; the personal API key
 * never reaches the browser). Returns null when not configured, or "error" when the query fails.
 */
export async function posthogPageviews(days: number): Promise<{ day: string; value: number }[] | null | "error"> {
  if (!isPosthogQueryConfigured()) return null;
  const key = `pv:${days}`;
  if (cache?.key === key && Date.now() - cache.at < 5 * 60_000) return cache.value;
  // Ingestion hosts look like eu.i.posthog.com; the private API lives on eu.posthog.com.
  const apiHost = env.posthogHost.replace(".i.posthog.com", ".posthog.com");
  try {
    const res = await fetch(`${apiHost}/api/projects/${encodeURIComponent(env.posthogProjectId!)}/query/`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${env.posthogPersonalKey}` },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: `SELECT toDate(timestamp) AS day, count() AS c FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL ${Math.min(Math.max(days, 1), 365)} DAY GROUP BY day ORDER BY day`,
        },
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) {
      logger.warn("posthog.query_failed", { status: res.status });
      return "error";
    }
    const json = (await res.json()) as { results?: [string, number][] };
    const value = (json.results ?? []).map(([day, c]) => ({ day: String(day).slice(0, 10), value: Number(c) }));
    cache = { key, at: Date.now(), value };
    return value;
  } catch (err) {
    logger.warn("posthog.query_failed", { error: err instanceof Error ? err.message : String(err) });
    return "error";
  }
}
