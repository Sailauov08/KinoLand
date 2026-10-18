import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env } from "@/lib/env";
import { one, q } from "@/lib/db";
import { findUserById, touchLastSeen, type User } from "@/lib/db/users";
import { hashToken, newSessionToken } from "./password";

export const SESSION_COOKIE = "kino_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSession(userId: string) {
  const token = newSessionToken();
  const now = Date.now();
  await q("DELETE FROM kinoland.sessions WHERE expires_at < $1", [now]);
  await q("INSERT INTO kinoland.sessions (token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)", [hashToken(token), userId, now + TTL_MS, now]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

/** Deletes the session row (server-side invalidation) and clears the cookie. */
export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await q("DELETE FROM kinoland.sessions WHERE token_hash = $1", [hashToken(token)]);
  jar.delete(SESSION_COOKIE);
}

/** Revokes every session of a user except (optionally) the current one — used after password change. */
export async function revokeOtherSessions(userId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const keep = token ? hashToken(token) : "";
  await q("DELETE FROM kinoland.sessions WHERE user_id = $1 AND token_hash <> $2", [userId, keep]);
}

/** Signs a user out everywhere (e.g. on suspension). */
export async function revokeAllSessions(userId: string): Promise<number> {
  return (await q<{ token_hash: string }>("DELETE FROM kinoland.sessions WHERE user_id = $1 RETURNING token_hash", [userId])).length;
}

/** Resolves a raw session token to an active user, or null when missing, expired or suspended. */
export async function userFromToken(token: string | undefined | null): Promise<User | null> {
  if (!token || token.length > 200) return null;
  const row = await one<{ user_id: string; expires_at: number }>("SELECT user_id, expires_at FROM kinoland.sessions WHERE token_hash = $1", [hashToken(token)]);
  if (!row || Number(row.expires_at) < Date.now()) return null;
  const user = await findUserById(row.user_id);
  if (!user || user.status !== "active") return null;
  await touchLastSeen(user.id, user.lastSeenAt);
  return user;
}

/** Current user for this request (memoised per request). */
export const getCurrentUser = cache(async (): Promise<User | null> => userFromToken((await cookies()).get(SESSION_COOKIE)?.value));

export async function requireUser(nextPath: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Page guard: the role is read from the database on every request, never from the client. */
export async function requireAdmin(nextPath = "/admin"): Promise<User> {
  const user = await requireUser(nextPath);
  if (user.role !== "admin") redirect("/?denied=admin");
  return user;
}

/** Only allow same-site relative redirects after login (prevents open redirects). */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
