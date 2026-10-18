/** Fixed-window in-memory rate limiter (per process). Good enough for a single-node deployment. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

/**
 * Fixed-window limiter stored in Postgres, so the limit holds across all serverless instances.
 * Used for login and registration. Returns true when the request is allowed.
 */
export async function rateLimitShared(key: string, limit: number, windowMs: number, now = Date.now()): Promise<boolean> {
  const { one, q } = await import("@/lib/db");
  const row = await one<{ count: number }>(
    `INSERT INTO kinoland.rate_limits (key, count, reset_at) VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN kinoland.rate_limits.reset_at <= $3 THEN 1 ELSE kinoland.rate_limits.count + 1 END,
       reset_at = CASE WHEN kinoland.rate_limits.reset_at <= $3 THEN $2 ELSE kinoland.rate_limits.reset_at END
     RETURNING count`,
    [key, now + windowMs, now],
  );
  if (Math.random() < 0.01) await q("DELETE FROM kinoland.rate_limits WHERE reset_at < $1", [now]);
  return (row?.count ?? 1) <= limit;
}
