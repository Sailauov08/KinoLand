import "server-only";
import { toSnapshot, type MovieSnapshot, type MovieSummary } from "@/lib/movies/types";
import { q } from "./index";

export type ListName = "watchlist" | "favorite";

export interface ListItem {
  movieId: number;
  snapshot: MovieSnapshot;
  addedAt: number;
}

export async function getList(userId: string, list: ListName): Promise<ListItem[]> {
  const rows = await q<{ movie_id: number; snapshot: MovieSnapshot; added_at: number }>(
    "SELECT movie_id, snapshot, added_at FROM kinoland.list_items WHERE user_id = $1 AND list = $2 ORDER BY added_at DESC",
    [userId, list],
  );
  return rows.map((r) => ({ movieId: r.movie_id, snapshot: r.snapshot, addedAt: Number(r.added_at) }));
}

export async function getAllMemberIds(userId: string): Promise<{ watchlist: number[]; favorite: number[] }> {
  const rows = await q<{ movie_id: number; list: ListName }>("SELECT movie_id, list FROM kinoland.list_items WHERE user_id = $1", [userId]);
  return {
    watchlist: rows.filter((r) => r.list === "watchlist").map((r) => r.movie_id),
    favorite: rows.filter((r) => r.list === "favorite").map((r) => r.movie_id),
  };
}

export async function addToList(userId: string, list: ListName, snapshot: MovieSnapshot) {
  await q(
    `INSERT INTO kinoland.list_items (user_id, list, movie_id, snapshot, added_at) VALUES ($1, $2, $3, $4::jsonb, $5)
     ON CONFLICT (user_id, list, movie_id) DO UPDATE SET snapshot = EXCLUDED.snapshot`,
    [userId, list, snapshot.id, JSON.stringify(snapshot), Date.now()],
  );
}

export async function removeFromList(userId: string, list: ListName, movieId: number) {
  await q("DELETE FROM kinoland.list_items WHERE user_id = $1 AND list = $2 AND movie_id = $3", [userId, list, movieId]);
}

export async function isInList(userId: string, list: ListName, movieId: number): Promise<boolean> {
  return (await q("SELECT 1 FROM kinoland.list_items WHERE user_id = $1 AND list = $2 AND movie_id = $3", [userId, list, movieId])).length > 0;
}

/** Rewrites stored snapshots for this user's saved films when TMDB returned newer data. */
export async function refreshListSnapshots(userId: string, movies: MovieSummary[]) {
  for (const m of movies) {
    const json = JSON.stringify(toSnapshot(m));
    await q("UPDATE kinoland.list_items SET snapshot = $1::jsonb WHERE user_id = $2 AND movie_id = $3 AND snapshot IS DISTINCT FROM $1::jsonb", [json, userId, m.id]);
  }
}
