import "server-only";
import { randomUUID } from "node:crypto";
import { GENRE_IDS } from "@/lib/movies/genres";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDb } from "./index";

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
  preferred_genres: string;
  locale: string | null;
  created_at: number;
  last_seen_at: number | null;
}

function parseGenres(json: string): number[] {
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((g): g is number => typeof g === "number" && GENRE_IDS.has(g)) : [];
  } catch {
    return [];
  }
}

const toUser = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  status: r.status ?? "active",
  preferredGenres: parseGenres(r.preferred_genres),
  locale: isLocale(r.locale) ? r.locale : null,
  createdAt: r.created_at,
  lastSeenAt: r.last_seen_at ?? null,
});

export function findUserByEmail(email: string): (User & { passwordHash: string }) | null {
  const row = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as UserRow | undefined;
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
}

export function findUserById(id: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}

/** New accounts are always regular users. Admins are designated only via the server-side CLI or by another admin. */
export function createUser(input: { email: string; name: string; passwordHash: string; locale: Locale }): User {
  const id = randomUUID();
  getDb()
    .prepare(
      "INSERT INTO users (id, email, name, password_hash, role, status, preferred_genres, locale, created_at) VALUES (?, ?, ?, ?, 'user', 'active', '[]', ?, ?)",
    )
    .run(id, input.email.toLowerCase(), input.name, input.passwordHash, input.locale, Date.now());
  return findUserById(id)!;
}

export function updateUserProfile(id: string, data: { name: string; preferredGenres: number[]; locale: Locale }) {
  getDb()
    .prepare("UPDATE users SET name = ?, preferred_genres = ?, locale = ? WHERE id = ?")
    .run(data.name, JSON.stringify(data.preferredGenres), data.locale, id);
}

export function updateUserLocale(id: string, locale: Locale) {
  getDb().prepare("UPDATE users SET locale = ? WHERE id = ?").run(locale, id);
}

export function updatePasswordHash(id: string, hash: string) {
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, id);
}

export function getPasswordHash(id: string): string | null {
  const row = getDb().prepare("SELECT password_hash FROM users WHERE id = ?").get(id) as { password_hash: string } | undefined;
  return row?.password_hash ?? null;
}

export function setUserRole(id: string, role: Role) {
  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
}

export function setUserStatus(id: string, status: AccountStatus) {
  getDb().prepare("UPDATE users SET status = ? WHERE id = ?").run(status, id);
}

/** Records activity at most once per 5 minutes per user to avoid a write on every request. */
export function touchLastSeen(id: string, previous: number | null, now = Date.now()) {
  if (previous && now - previous < 5 * 60_000) return;
  getDb().prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").run(now, id);
}

export function countActiveAdmins(): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'").get() as { n: number }).n;
}

export interface UserListItem extends User {
  watchlistCount: number;
  favoriteCount: number;
}

export const USER_SORTS = ["newest", "oldest", "name", "lastSeen"] as const;
export type UserSort = (typeof USER_SORTS)[number];

const SORT_SQL: Record<UserSort, string> = {
  newest: "u.created_at DESC",
  oldest: "u.created_at ASC",
  name: "u.name COLLATE NOCASE ASC",
  lastSeen: "COALESCE(u.last_seen_at, 0) DESC",
};

export function listUsersPaged(opts: {
  query?: string;
  role?: Role | null;
  status?: AccountStatus | null;
  sort?: UserSort;
  page?: number;
  perPage?: number;
}): { items: UserListItem[]; total: number; page: number; totalPages: number } {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.query) {
    // LIKE wildcards in user input are escaped so a search can't match everything unexpectedly.
    const q = `%${opts.query.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
    where.push("(u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.id LIKE ? ESCAPE '\\')");
    params.push(q, q, q);
  }
  if (opts.role) {
    where.push("u.role = ?");
    params.push(opts.role);
  }
  if (opts.status) {
    where.push("u.status = ?");
    params.push(opts.status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const perPage = Math.min(Math.max(opts.perPage ?? 20, 1), 100);
  const total = (getDb().prepare(`SELECT COUNT(*) AS n FROM users u ${whereSql}`).get(...params) as { n: number }).n;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(opts.page ?? 1, 1), totalPages);
  const rows = getDb()
    .prepare(
      `SELECT u.*,
        (SELECT COUNT(*) FROM list_items li WHERE li.user_id = u.id AND li.list = 'watchlist') AS watchlist_count,
        (SELECT COUNT(*) FROM list_items li WHERE li.user_id = u.id AND li.list = 'favorite') AS favorite_count
       FROM users u ${whereSql} ORDER BY ${SORT_SQL[opts.sort ?? "newest"]} LIMIT ? OFFSET ?`,
    )
    .all(...params, perPage, (page - 1) * perPage) as unknown as (UserRow & { watchlist_count: number; favorite_count: number })[];
  return {
    items: rows.map((r) => ({ ...toUser(r), watchlistCount: r.watchlist_count, favoriteCount: r.favorite_count })),
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

export function getUserStats(now = Date.now()): UserStats {
  const db = getDb();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const n = (sql: string, ...p: number[]) => (db.prepare(sql).get(...p) as { n: number }).n;
  return {
    total: n("SELECT COUNT(*) AS n FROM users"),
    admins: n("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'"),
    suspended: n("SELECT COUNT(*) AS n FROM users WHERE status = 'suspended'"),
    newToday: n("SELECT COUNT(*) AS n FROM users WHERE created_at >= ?", startOfDay.getTime()),
    newThisWeek: n("SELECT COUNT(*) AS n FROM users WHERE created_at >= ?", now - 7 * 86_400_000),
    activeLast7d: n("SELECT COUNT(*) AS n FROM users WHERE last_seen_at >= ?", now - 7 * 86_400_000),
  };
}

/** Registrations per day (local time) since `from`, for growth charts. */
export function signupsByDay(from: number): { day: string; count: number }[] {
  return getDb()
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch', 'localtime') AS day, COUNT(*) AS count
       FROM users WHERE created_at >= ? GROUP BY day ORDER BY day`,
    )
    .all(from) as unknown as { day: string; count: number }[];
}

export function countUsersBefore(ts: number): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE created_at < ?").get(ts) as { n: number }).n;
}

export function countActiveSessions(userId: string, now = Date.now()): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND expires_at > ?").get(userId, now) as { n: number }).n;
}

export function listCounts(userId: string): { watchlist: number; favorite: number } {
  const rows = getDb().prepare("SELECT list, COUNT(*) AS n FROM list_items WHERE user_id = ? GROUP BY list").all(userId) as unknown as { list: string; n: number }[];
  return { watchlist: rows.find((r) => r.list === "watchlist")?.n ?? 0, favorite: rows.find((r) => r.list === "favorite")?.n ?? 0 };
}
