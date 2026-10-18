import { NextResponse, type NextRequest } from "next/server";
import { forwardToPosthog, ANON_ID_COOKIE, CONSENT_COOKIE, clientIp } from "@/lib/analytics/server";
import { clientEventSchema, isBot, sanitizePath, sanitizeSearchQuery } from "@/lib/analytics/sanitize";
import { rateLimit } from "@/lib/auth/rate-limit";
import { recordError } from "@/lib/db/errors";
import { recordEvent, visitorHash } from "@/lib/db/events";

/**
 * First-party analytics ingest. Accepts only whitelisted events from same-origin pages,
 * stores no IP addresses (daily-salted hash only) and strips search text that may be personal.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const ua = req.headers.get("user-agent");
  if (isBot(ua)) return new NextResponse(null, { status: 204 });

  const hash = visitorHash(clientIp(req.headers), ua ?? "");
  if (!rateLimit(`events:${hash}`, 120, 60_000)) return new NextResponse(null, { status: 429 });

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 4000) return new NextResponse(null, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = clientEventSchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const e = parsed.data;
  const path = sanitizePath(e.path);

  if (e.type === "client_error") {
    recordError({ source: "client", event: "client_error", message: e.props.message, path });
    return new NextResponse(null, { status: 204 });
  }

  let props: Record<string, unknown> | null = null;
  let movieId: number | null = null;
  switch (e.type) {
    case "movie_view":
    case "playback_started":
    case "playback_error":
      movieId = e.movieId;
      props = { ...e.props };
      break;
    case "movie_search":
      props = { ...e.props, query: sanitizeSearchQuery(e.props.query) };
      movieId = e.props.topMovieId ?? null;
      break;
  }

  recordEvent({ type: e.type, visitorHash: hash, path, movieId, props });

  if (req.cookies.get(CONSENT_COOKIE)?.value === "granted") {
    const posthogProps = { ...props, movie_id: movieId ?? undefined, $current_url: path ?? undefined };
    await forwardToPosthog(e.type === "page_view" ? "$pageview" : e.type, req.cookies.get(ANON_ID_COOKIE)?.value, posthogProps);
  }
  return new NextResponse(null, { status: 204 });
}
