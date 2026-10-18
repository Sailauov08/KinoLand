import "server-only";
import { getList } from "@/lib/db/lists";
import type { User } from "@/lib/db/users";
import type { Locale } from "@/lib/i18n/config";
import { genreAffinity, rankRecommendations, topGenres, type TasteInput } from "@/lib/movies/recommend";
import { getRecommendationCandidates } from "@/lib/movies/service";

export async function getRecommendationsFor(user: User, locale: Locale, limit = 24) {
  const taste: TasteInput = {
    preferredGenres: user.preferredGenres,
    favorites: (await getList(user.id, "favorite")).map((i) => i.snapshot),
    watchlist: (await getList(user.id, "watchlist")).map((i) => i.snapshot),
  };
  const genres = topGenres(genreAffinity(taste), 3);
  const hasTaste = genres.length > 0;
  if (!hasTaste) return { hasTaste, genres, items: [], unavailable: undefined };
  const seeds = [...taste.favorites, ...taste.watchlist].map((m) => m.id);
  const candidates = await getRecommendationCandidates(genres, seeds, locale);
  if (!candidates.ok) return { hasTaste, genres, items: [], unavailable: candidates.reason };
  return { hasTaste, genres, items: rankRecommendations(candidates.data, taste, limit), unavailable: undefined };
}
