import "server-only";
import { cache } from "react";
import { isTmdbConfigured } from "@/lib/env";
import { localeTags, type Locale } from "@/lib/i18n/config";
import { logger } from "@/lib/logger";
import {
  demoByGenre,
  demoDetails,
  demoDiscover,
  demoMoviesByIds,
  demoTopList,
  demoTrending,
} from "./demo-provider";
import { matchesFilters, paginate, sortMovies, type MovieFilters } from "./filters";
import { tmdbFetch, TmdbError } from "./tmdb";
import { mapDetails, mapMovie, mapPaged } from "./tmdb-schema";
import type { MovieDetails, MovieSummary, Paged, Sourced } from "./types";

const HOUR = 3600;
const DAY = 86400;

const lang = (locale: Locale) => localeTags[locale];

/**
 * Runs the live TMDB call, falling back to the demo catalogue when TMDB is not configured
 * or fails. The `source`/`notice` fields let the UI label demo data honestly.
 */
async function withFallback<T>(live: () => Promise<T>, demo: () => T): Promise<Sourced<T>> {
  if (!isTmdbConfigured()) return { data: demo(), source: "demo", notice: "unconfigured" };
  // Circuit breaker: after a failure, serve demo data immediately for a short cool-down
  // instead of making every page view wait on a TMDB timeout.
  if (Date.now() < breakerOpenUntil) return { data: demo(), source: "demo", notice: "unavailable" };
  try {
    return { data: await live(), source: "live" };
  } catch (err) {
    breakerOpenUntil = Date.now() + BREAKER_COOLDOWN_MS;
    logger.warn("movies.fallback_to_demo", {
      error: err instanceof Error ? err.message : String(err),
      retryInMs: BREAKER_COOLDOWN_MS,
    });
    return { data: demo(), source: "demo", notice: "unavailable" };
  }
}

const BREAKER_COOLDOWN_MS = 60_000;
let breakerOpenUntil = 0;

/** Test hook: closes the circuit breaker. */
export function resetCircuitBreaker() {
  breakerOpenUntil = 0;
}

const listFrom = async (path: string, locale: Locale, params: Record<string, string | number> = {}, revalidate = HOUR) =>
  mapPaged(await tmdbFetch(path, { language: lang(locale), ...params }, revalidate));

export const getTrending = cache((locale: Locale) =>
  withFallback(async () => (await listFrom("/trending/movie/week", locale)).results, () => demoTrending(locale)),
);

export const getTopRatedRail = cache((locale: Locale) =>
  withFallback(async () => (await listFrom("/movie/top_rated", locale, {}, DAY)).results, () => demoTopList(locale).slice(0, 20)),
);

export const getNowPlaying = cache((locale: Locale) =>
  withFallback(
    async () => (await listFrom("/movie/now_playing", locale)).results,
    // Demo data has no release calendar, so this rail is hidden rather than mislabelled.
    () => [] as MovieSummary[],
  ),
);

export const getUpcoming = cache((locale: Locale) =>
  withFallback(async () => (await listFrom("/movie/upcoming", locale)).results, () => [] as MovieSummary[]),
);

export const getByGenre = cache((genre: number, locale: Locale) =>
  withFallback(
    async () =>
      (
        await listFrom("/discover/movie", locale, {
          with_genres: genre,
          sort_by: "popularity.desc",
          "vote_count.gte": 300,
          include_adult: "false",
        })
      ).results,
    () => demoByGenre(genre, locale),
  ),
);

/** TMDB's 100 highest-rated films (5 pages of /movie/top_rated). */
export const getTop100 = cache((locale: Locale) =>
  withFallback(
    async () => {
      const pages = await Promise.all([1, 2, 3, 4, 5].map((page) => listFrom("/movie/top_rated", locale, { page }, DAY)));
      const seen = new Set<number>();
      return pages
        .flatMap((p) => p.results)
        .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
        .slice(0, 100);
    },
    () => demoTopList(locale),
  ),
);

async function liveDetails(id: number, locale: Locale): Promise<MovieDetails | null> {
  const language = lang(locale);
  let raw: unknown;
  try {
    raw = await tmdbFetch(
      `/movie/${id}`,
      {
        language,
        append_to_response: "credits,videos,recommendations",
        include_video_language: `${locale},en,null`,
      },
      DAY,
    );
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) return null;
    throw err;
  }
  const details = mapDetails(raw, locale);
  if (!details) return null;
  // Many titles have no ru/kk synopsis on TMDB; fall back to the English one.
  if (locale !== "en" && (!details.overview || !details.tagline)) {
    try {
      const en = mapDetails(await tmdbFetch(`/movie/${id}`, { language: "en-US" }, DAY), "en");
      if (en) {
        details.overview ||= en.overview;
        details.tagline ||= en.tagline;
      }
    } catch {
      /* keep localized fields as-is */
    }
  }
  return details;
}

export const getMovie = cache((id: number, locale: Locale) =>
  withFallback(() => liveDetails(id, locale), () => demoDetails(id, locale)),
);

export type SearchMode = "search" | "discover";

const DISCOVER_SORT: Record<MovieFilters["sort"], string> = {
  popularity: "popularity.desc",
  rating: "vote_average.desc",
  newest: "primary_release_date.desc",
  oldest: "primary_release_date.asc",
  title: "title.asc",
};

/**
 * Text queries use /search/movie (TMDB doesn't support genre/rating filters there, so those are
 * applied to the returned page). Without a query, /discover/movie applies all filters server-side.
 */
export async function searchMovies(f: MovieFilters, locale: Locale): Promise<Sourced<Paged<MovieSummary> & { mode: SearchMode }>> {
  const mode: SearchMode = f.query ? "search" : "discover";
  const res = await withFallback(
    async () => {
      if (f.query) {
        const p = await listFrom("/search/movie", locale, {
          query: f.query,
          page: f.page,
          include_adult: "false",
          ...(f.yearFrom && f.yearFrom === f.yearTo ? { primary_release_year: f.yearFrom } : {}),
        });
        return { ...p, results: sortMovies(p.results.filter((m) => matchesFilters(m, f)), f.sort, locale) };
      }
      return listFrom("/discover/movie", locale, {
        page: f.page,
        include_adult: "false",
        sort_by: DISCOVER_SORT[f.sort],
        // Avoid obscure titles with a handful of votes dominating rating/date sorts.
        "vote_count.gte": f.sort === "rating" ? 300 : f.sort === "popularity" ? 0 : 20,
        ...(f.genres.length ? { with_genres: f.genres.join(",") } : {}),
        ...(f.yearFrom ? { "primary_release_date.gte": `${f.yearFrom}-01-01` } : {}),
        ...(f.yearTo ? { "primary_release_date.lte": `${f.yearTo}-12-31` } : {}),
        ...(f.ratingMin ? { "vote_average.gte": f.ratingMin } : {}),
        ...(f.language ? { with_original_language: f.language } : {}),
      });
    },
    () => demoDiscover(f, locale),
  );
  return { ...res, data: { ...res.data, mode } };
}

/** Lightweight localized summaries for a list of ids (watchlists, collections). Missing ids are skipped. */
export async function getMovieSummaries(ids: number[], locale: Locale): Promise<Sourced<Map<number, MovieSummary>>> {
  return withFallback(
    async () => {
      const out = new Map<number, MovieSummary>();
      const queue = ids.slice(0, 120);
      const worker = async () => {
        while (queue.length) {
          const id = queue.shift()!;
          try {
            const m = mapMovie(await tmdbFetch(`/movie/${id}`, { language: lang(locale) }, DAY));
            if (m) out.set(id, m);
          } catch (err) {
            if (!(err instanceof TmdbError && err.status === 404)) throw err;
          }
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      return out;
    },
    () => new Map(demoMoviesByIds(ids, locale).map((m) => [m.id, m])),
  );
}

/** Candidate pool for recommendations: top titles in the user's genres + TMDB recommendations of seed films. */
export async function getRecommendationCandidates(genres: number[], seedIds: number[], locale: Locale) {
  return withFallback(
    async () => {
      const requests: Promise<Paged<MovieSummary>>[] = [];
      if (genres.length) {
        for (const page of [1, 2]) {
          requests.push(
            listFrom("/discover/movie", locale, {
              with_genres: genres.join("|"),
              sort_by: "vote_average.desc",
              "vote_count.gte": 800,
              page,
            }, DAY),
          );
        }
      }
      for (const id of seedIds.slice(0, 3)) {
        requests.push(listFrom(`/movie/${id}/recommendations`, locale, {}, DAY).catch(() => paginate<MovieSummary>([], 1, 20)));
      }
      if (!requests.length) requests.push(listFrom("/trending/movie/week", locale));
      const pages = await Promise.all(requests);
      const map = new Map<number, MovieSummary>();
      for (const m of pages.flatMap((p) => p.results)) map.set(m.id, m);
      return [...map.values()];
    },
    () => demoTopList(locale),
  );
}
