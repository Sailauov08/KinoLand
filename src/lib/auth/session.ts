import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { findUserById, type User } from "@/lib/db/users";
import { hashToken, newSessionToken } from "./password";

const COOKIE = "kino_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSession(userId: string) {
  const token = newSessionToken();
  const now = Date.now();
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    hashToken(token),
    userId,
    now + TTL_MS,
    now,
  );
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  jar.delete(COOKIE);
}

/** Revokes every session of a user except (optionally) the current one — used after password change. */
export async function revokeOtherSessions(userId: string) {
  const token = (await cookies()).get(COOKIE)?.value;
  const keep = token ? hashToken(token) : "";
  getDb().prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").run(userId, keep);
}

/** Current user for this request (memoised per request). Returns null when signed out or expired. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = getDb().prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?").get(hashToken(token)) as
    | { user_id: string; expires_at: number }
    | undefined;
  if (!row || row.expires_at < Date.now()) return null;
  return findUserById(row.user_id);
});

export async function requireUser(nextPath: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

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
