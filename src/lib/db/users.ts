import "server-only";
import { randomUUID } from "node:crypto";
import { GENRE_IDS } from "@/lib/movies/genres";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDb } from "./index";

export type Role = "user" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  preferredGenres: number[];
  locale: Locale | null;
  createdAt: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  preferred_genres: string;
  locale: string | null;
  created_at: number;
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
  preferredGenres: parseGenres(r.preferred_genres),
  locale: isLocale(r.locale) ? r.locale : null,
  createdAt: r.created_at,
});

export function findUserByEmail(email: string): (User & { passwordHash: string }) | null {
  const row = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as UserRow | undefined;
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
}

export function findUserById(id: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function createUser(input: { email: string; name: string; passwordHash: string; role: Role; locale: Locale }): User {
  const id = randomUUID();
  getDb()
    .prepare(
      "INSERT INTO users (id, email, name, password_hash, role, preferred_genres, locale, created_at) VALUES (?, ?, ?, ?, ?, '[]', ?, ?)",
    )
    .run(id, input.email.toLowerCase(), input.name, input.passwordHash, input.role, input.locale, Date.now());
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

export function countAdmins(): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get() as { n: number }).n;
}

export function listUsers(): (User & { watchlistCount: number; favoriteCount: number })[] {
  const rows = getDb()
    .prepare(
      `SELECT u.*,
        (SELECT COUNT(*) FROM list_items li WHERE li.user_id = u.id AND li.list = 'watchlist') AS watchlist_count,
        (SELECT COUNT(*) FROM list_items li WHERE li.user_id = u.id AND li.list = 'favorite') AS favorite_count
       FROM users u ORDER BY u.created_at DESC LIMIT 500`,
    )
    .all() as unknown as (UserRow & { watchlist_count: number; favorite_count: number })[];
  return rows.map((r) => ({ ...toUser(r), watchlistCount: r.watchlist_count, favoriteCount: r.favorite_count }));
}
