import "server-only";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { GENRE_IDS } from "@/lib/movies/genres";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { startOfDayInTz } from "@/lib/time";
import { count, one, q } from "./index";

export type Role = "user" | "admin";
export type AccountStatus = "active" | "suspended";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: AccountStatus;
  preferredGenres: number[];
  locale: Locale | null;
  createdAt: number;
  lastSeenAt: number | null;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  status: AccountStatus;
  preferred_genres: unknown;
  locale: string | null;
  created_at: number;
  last_seen_at: number | null;
}

const parseGenres = (v: unknown): number[] =>
  Array.isArray(v) ? v.filter((g): g is number => typeof g === "number" && GENRE_IDS.has(g)) : [];

const toUser = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  status: r.status ?? "active",
  preferredGenres: parseGenres(r.preferred_genres),
  locale: isLocale(r.locale) ? r.locale : null,
  createdAt: Number(r.created_at),
  lastSeenAt: r.last_seen_at === null ? null : Number(r.last_seen_at),
});

export async function findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const row = await one<UserRow>("SELECT * FROM kinoland.users WHERE email = $1", [email.toLowerCase()]);
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const row = await one<UserRow>("SELECT * FROM kinoland.users WHERE id = $1", [id]);
  return row ? toUser(row) : null;
}

/** New accounts are always regular users. Admins are designated only via the server-side CLI or by another admin. */
export async function createUser(input: { email: string; name: string; passwordHash: string; locale: Locale }): Promise<User> {
  const id = randomUUID();
  await q(
    `INSERT INTO kinoland.users (id, email, name, password_hash, role, status, preferred_genres, locale, created_at)
     VALUES ($1, $2, $3, $4, 'user', 'active', '[]'::jsonb, $5, $6)`,
    [id, input.email.toLowerCase(), input.name, input.passwordHash, input.locale, Date.now()],
  );
  return (await findUserById(id))!;
}

export async function updateUserProfile(id: string, data: { name: string; preferredGenres: number[]; locale: Locale }) {
  await q("UPDATE kinoland.users SET name = $1, preferred_genres = $2::jsonb, locale = $3 WHERE id = $4", [
    data.name,
    JSON.stringify(data.preferredGenres),
    data.locale,
    id,
  ]);
}

export async function updateUserLocale(id: string, locale: Locale) {
  await q("UPDATE kinoland.users SET locale = $1 WHERE id = $2", [locale, id]);
}

export async function updatePasswordHash(id: string, hash: string) {
  await q("UPDATE kinoland.users SET password_hash = $1 WHERE id = $2", [hash, id]);
}

export async function getPasswordHash(id: string): Promise<string | null> {
  return (await one<{ password_hash: string }>("SELECT password_hash FROM kinoland.users WHERE id = $1", [id]))?.password_hash ?? null;
}

export async function setUserRole(id: string, role: Role) {
  await q("UPDATE kinoland.users SET role = $1 WHERE id = $2", [role, id]);
}

export async function setUserStatus(id: string, status: AccountStatus) {
  await q("UPDATE kinoland.users SET status = $1 WHERE id = $2", [status, id]);
}

/** Records activity at most once per 5 minutes per user to avoid a write on every request. */
export async function touchLastSeen(id: string, previous: number | null, now = Date.now()) {
  if (previous && now - previous < 5 * 60_000) return;
  await q("UPDATE kinoland.users SET last_seen_at = $1 WHERE id = $2", [now, id]);
}

export const countActiveAdmins = () => count("SELECT COUNT(*)::int AS n FROM kinoland.users WHERE role = 'admin' AND status = 'active'");

export interface UserListItem extends User {
  watchlistCount: number;
  favoriteCount: number;
}

export const USER_SORTS = ["newest", "oldest", "name", "lastSeen"] as const;
export type UserSort = (typeof USER_SORTS)[number];

const SORT_SQL: Record<UserSort, string> = {
  newest: "u.created_at DESC",
  oldest: "u.created_at ASC",
  name: "lower(u.name) ASC",
  lastSeen: "COALESCE(u.last_seen_at, 0) DESC",
};

export async function listUsersPaged(opts: {
  query?: string;
  role?: Role | null;
  status?: AccountStatus | null;
  sort?: UserSort;
  page?: number;
  perPage?: number;
}): Promise<{ items: UserListItem[]; total: number; page: number; totalPages: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.query) {
    // LIKE wildcards in user input are escaped so a search can't match everything unexpectedly.
    params.push(`%${opts.query.replace(/[\\%_]/g, (c) => "\\" + c)}%`);
    const p = `$${params.length}`;
    where.push(`(u.name ILIKE ${p} OR u.email ILIKE ${p} OR u.id ILIKE ${p})`);
  }
  if (opts.role) {
    params.push(opts.role);
    where.push(`u.role = $${params.length}`);
  }
  if (opts.status) {
    params.push(opts.status);
    where.push(`u.status = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const perPage = Math.min(Math.max(opts.perPage ?? 20, 1), 100);
  const total = await count(`SELECT COUNT(*)::int AS n FROM kinoland.users u ${whereSql}`, params);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(opts.page ?? 1, 1), totalPages);
  const rows = await q<UserRow & { watchlist_count: number; favorite_count: number }>(
    `SELECT u.*,
       (SELECT COUNT(*)::int FROM kinoland.list_items li WHERE li.user_id = u.id AND li.list = 'watchlist') AS watchlist_count,
       (SELECT COUNT(*)::int FROM kinoland.list_items li WHERE li.user_id = u.id AND li.list = 'favorite') AS favorite_count
     FROM kinoland.users u ${whereSql} ORDER BY ${SORT_SQL[opts.sort ?? "newest"]}, u.id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, perPage, (page - 1) * perPage],
  );
  return {
    items: rows.map((r) => ({ ...toUser(r), watchlistCount: Number(r.watchlist_count), favoriteCount: Number(r.favorite_count) })),
    total,
    page,
    totalPages,
  };
}

export interface UserStats {
  total: number;
  admins: number;
  suspended: number;
  newToday: number;
  newThisWeek: number;
  activeLast7d: number;
}

export async function getUserStats(now = Date.now()): Promise<UserStats> {
  const row = await one<Record<string, number>>(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
            COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
            COUNT(*) FILTER (WHERE created_at >= $1)::int AS new_today,
            COUNT(*) FILTER (WHERE created_at >= $2)::int AS new_week,
            COUNT(*) FILTER (WHERE last_seen_at >= $2)::int AS active_7d
     FROM kinoland.users`,
    [startOfDayInTz(now, env.appTimezone), now - 7 * 86_400_000],
  );
  return {
    total: Number(row?.total ?? 0),
    admins: Number(row?.admins ?? 0),
    suspended: Number(row?.suspended ?? 0),
    newToday: Number(row?.new_today ?? 0),
    newThisWeek: Number(row?.new_week ?? 0),
    activeLast7d: Number(row?.active_7d ?? 0),
  };
}

/** SQL expression for the calendar day of an epoch-ms column in the app time zone. */
export const DAY_SQL = (col: string, tzParam: string) => `to_char(to_timestamp(${col} / 1000.0) AT TIME ZONE ${tzParam}, 'YYYY-MM-DD')`;

/** Registrations per day since `from`, for growth charts. */
export function signupsByDay(from: number): Promise<{ day: string; count: number }[]> {
  return q(
    `SELECT ${DAY_SQL("created_at", "$2")} AS day, COUNT(*)::int AS count
     FROM kinoland.users WHERE created_at >= $1 GROUP BY day ORDER BY day`,
    [from, env.appTimezone],
  );
}

export const countUsersBefore = (ts: number) => count("SELECT COUNT(*)::int AS n FROM kinoland.users WHERE created_at < $1", [ts]);
export const countUsersSince = (ts: number) => count("SELECT COUNT(*)::int AS n FROM kinoland.users WHERE created_at >= $1", [ts]);

export const countActiveSessions = (userId: string, now = Date.now()) =>
  count("SELECT COUNT(*)::int AS n FROM kinoland.sessions WHERE user_id = $1 AND expires_at > $2", [userId, now]);

export async function listCounts(userId: string): Promise<{ watchlist: number; favorite: number }> {
  const rows = await q<{ list: string; n: number }>("SELECT list, COUNT(*)::int AS n FROM kinoland.list_items WHERE user_id = $1 GROUP BY list", [userId]);
  return { watchlist: rows.find((r) => r.list === "watchlist")?.n ?? 0, favorite: rows.find((r) => r.list === "favorite")?.n ?? 0 };
}
