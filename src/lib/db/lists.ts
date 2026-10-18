import "server-only";
import type { MovieSnapshot } from "@/lib/movies/types";
import { getDb } from "./index";

export type ListName = "watchlist" | "favorite";

export interface ListItem {
  movieId: number;
  snapshot: MovieSnapshot;
  addedAt: number;
}

export function getList(userId: string, list: ListName): ListItem[] {
  const rows = getDb()
    .prepare("SELECT movie_id, snapshot, added_at FROM list_items WHERE user_id = ? AND list = ? ORDER BY added_at DESC")
    .all(userId, list) as { movie_id: number; snapshot: string; added_at: number }[];
  return rows.map((r) => ({ movieId: r.movie_id, snapshot: JSON.parse(r.snapshot) as MovieSnapshot, addedAt: r.added_at }));
}

/** Which of the given lists contain the movie, for button state. */
export function getMembership(userId: string, movieIds: number[]): Map<number, Set<ListName>> {
  const out = new Map<number, Set<ListName>>();
  if (!movieIds.length) return out;
  const placeholders = movieIds.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT movie_id, list FROM list_items WHERE user_id = ? AND movie_id IN (${placeholders})`)
    .all(userId, ...movieIds) as { movie_id: number; list: ListName }[];
  for (const r of rows) {
    if (!out.has(r.movie_id)) out.set(r.movie_id, new Set());
    out.get(r.movie_id)!.add(r.list);
  }
  return out;
}

export function getAllMemberIds(userId: string): { watchlist: number[]; favorite: number[] } {
  const rows = getDb().prepare("SELECT movie_id, list FROM list_items WHERE user_id = ?").all(userId) as {
    movie_id: number;
    list: ListName;
  }[];
  return {
    watchlist: rows.filter((r) => r.list === "watchlist").map((r) => r.movie_id),
    favorite: rows.filter((r) => r.list === "favorite").map((r) => r.movie_id),
  };
}

export function addToList(userId: string, list: ListName, snapshot: MovieSnapshot) {
  getDb()
    .prepare(
      `INSERT INTO list_items (user_id, list, movie_id, snapshot, added_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, list, movie_id) DO UPDATE SET snapshot = excluded.snapshot`,
    )
    .run(userId, list, snapshot.id, JSON.stringify(snapshot), Date.now());
}

export function removeFromList(userId: string, list: ListName, movieId: number) {
  getDb().prepare("DELETE FROM list_items WHERE user_id = ? AND list = ? AND movie_id = ?").run(userId, list, movieId);
}

export function isInList(userId: string, list: ListName, movieId: number): boolean {
  return !!getDb().prepare("SELECT 1 FROM list_items WHERE user_id = ? AND list = ? AND movie_id = ?").get(userId, list, movieId);
}
