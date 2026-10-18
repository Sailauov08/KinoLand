import { NextResponse } from "next/server";

/**
 * Liveness probe for the hosting platform (Render health checks). Deliberately does not touch the
 * database or TMDB, so a slow dependency can't make the platform restart a healthy server.
 * Detailed status for admins lives at /admin/health.
 */
export function GET() {
  return NextResponse.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
}
