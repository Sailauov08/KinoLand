import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@/lib/db/users";
import { rateLimit } from "./rate-limit";
import { SESSION_COOKIE, userFromToken } from "./session";

/**
 * Guard for admin Route Handlers: 401 without a valid session, 403 for non-admins, 429 when
 * an admin client exceeds the rate limit. Returns the admin user on success.
 */
export function requireAdminApi(req: NextRequest): { user: User } | { response: NextResponse } {
  const user = userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (user.role !== "admin") return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  if (!rateLimit(`admin-api:${user.id}`, 120, 60_000)) return { response: NextResponse.json({ error: "rate_limited" }, { status: 429 }) };
  return { user };
}

/** Server-action guard. Throws so nothing after it can run for non-admins. */
export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}
