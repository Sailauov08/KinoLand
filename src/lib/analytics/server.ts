import "server-only";
import { cookies, headers } from "next/headers";
import { recordEvent, visitorHash, type EventType } from "@/lib/db/events";
import { env } from "@/lib/env";
import { isBot } from "./sanitize";

export const CONSENT_COOKIE = "kl_consent";
export const ANON_ID_COOKIE = "kl_aid";

export function clientIp(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/**
 * Forwards an event to PostHog, but only when it is configured AND the visitor granted consent.
 * The distinct id is a random consent-scoped id (never an email or account id).
 */
export async function forwardToPosthog(event: string, distinctId: string | undefined, properties: Record<string, unknown>) {
  if (!env.posthogKey || !distinctId) return;
  try {
    await fetch(`${env.posthogHost}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: env.posthogKey, event, distinct_id: distinctId, properties: { ...properties, $process_person_profile: false } }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* analytics must never affect the user flow */
  }
}

/** Records a server-side event (signup, login, watchlist changes) in first-party analytics. */
export async function trackServer(type: EventType, data: { userId?: string; movieId?: number; props?: Record<string, unknown> } = {}) {
  try {
    const h = await headers();
    const ua = h.get("user-agent");
    if (isBot(ua)) return;
    await recordEvent({ type, visitorHash: await visitorHash(clientIp(h), ua ?? ""), userId: data.userId, movieId: data.movieId, props: data.props });
    const jar = await cookies();
    if (jar.get(CONSENT_COOKIE)?.value === "granted") {
      await forwardToPosthog(type, jar.get(ANON_ID_COOKIE)?.value, { movie_id: data.movieId, ...data.props });
    }
  } catch {
    /* never break the action being tracked */
  }
}
