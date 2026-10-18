"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { addToList, isInList, removeFromList } from "@/lib/db/lists";
import { getLocale } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { getMovie } from "@/lib/movies/service";
import { toSnapshot } from "@/lib/movies/types";
import { listNameSchema, movieIdSchema } from "@/lib/validation";

export type ToggleResult = { ok: true; inList: boolean } | { ok: false; reason: "auth" | "invalid" | "not_found" | "error" };

/**
 * Adds/removes a film from the signed-in user's watchlist or favourites. The stored snapshot is
 * built server-side from the movie service — client-supplied metadata is never trusted.
 */
export async function toggleListAction(rawMovieId: unknown, rawList: unknown, desired: unknown): Promise<ToggleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "auth" };
  const movieId = movieIdSchema.safeParse(rawMovieId);
  const list = listNameSchema.safeParse(rawList);
  if (!movieId.success || !list.success || typeof desired !== "boolean") return { ok: false, reason: "invalid" };

  try {
    if (!desired) {
      removeFromList(user.id, list.data, movieId.data);
      return { ok: true, inList: false };
    }
    if (isInList(user.id, list.data, movieId.data)) return { ok: true, inList: true };
    const { data: movie } = await getMovie(movieId.data, await getLocale());
    if (!movie) return { ok: false, reason: "not_found" };
    addToList(user.id, list.data, toSnapshot(movie));
    return { ok: true, inList: true };
  } catch (err) {
    logger.error("lists.toggle_failed", { userId: user.id, error: err instanceof Error ? err.message : String(err) });
    return { ok: false, reason: "error" };
  }
}
