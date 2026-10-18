/** Pure recommendation scoring: preferred genres + genres of favourites/watchlist. */
import type { MovieSnapshot, MovieSummary } from "./types";

export interface TasteInput {
  preferredGenres: number[];
  favorites: MovieSnapshot[];
  watchlist: MovieSnapshot[];
}

const WEIGHT = { preferred: 3, favorite: 2, watchlist: 1 } as const;

/** Weighted genre affinity, normalised to 0..1. */
export function genreAffinity(input: TasteInput): Map<number, number> {
  const scores = new Map<number, number>();
  const add = (g: number, w: number) => scores.set(g, (scores.get(g) ?? 0) + w);
  input.preferredGenres.forEach((g) => add(g, WEIGHT.preferred));
  input.favorites.forEach((m) => m.genreIds.forEach((g) => add(g, WEIGHT.favorite)));
  input.watchlist.forEach((m) => m.genreIds.forEach((g) => add(g, WEIGHT.watchlist)));
  const max = Math.max(0, ...scores.values());
  if (max > 0) for (const [g, s] of scores) scores.set(g, s / max);
  return scores;
}

export function topGenres(affinity: Map<number, number>, n = 3): number[] {
  return [...affinity.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([g]) => g);
}

export interface ScoredMovie {
  movie: MovieSummary;
  score: number;
  matchedGenres: number[];
}

/**
 * Ranks candidates: genre match dominates, community rating breaks ties.
 * Titles the user already saved are excluded.
 */
export function rankRecommendations(
  candidates: MovieSummary[],
  input: TasteInput,
  limit = 24,
): ScoredMovie[] {
  const affinity = genreAffinity(input);
  const exclude = new Set([...input.favorites, ...input.watchlist].map((m) => m.id));
  const seen = new Set<number>();
  return candidates
    .filter((m) => !exclude.has(m.id) && !seen.has(m.id) && (seen.add(m.id), true))
    .map((movie) => {
      const matchedGenres = movie.genreIds.filter((g) => affinity.has(g));
      const genreScore = matchedGenres.reduce((sum, g) => sum + (affinity.get(g) ?? 0), 0);
      const ratingScore = movie.voteAverage !== null ? movie.voteAverage / 10 : 0.5;
      return { movie, matchedGenres, score: genreScore * 2 + ratingScore };
    })
    .filter((r) => affinity.size === 0 || r.matchedGenres.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
