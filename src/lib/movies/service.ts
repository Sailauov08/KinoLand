import "server-only";
import { cache } from "react";
import { isTmdbConfigured } from "@/lib/env";
import { localeTags, type Locale } from "@/lib/i18n/config";
import { hiddenMovieIds } from "@/lib/db/content";
import { logger } from "@/lib/logger";
import { matchesFilters, sortMovies, type MovieFilters } from "./filters";
import { tmdbFetch, TmdbError } from "./tmdb";
import { mapDetails, mapMovie, mapPaged } from "./tmdb-schema";
import type { MovieDetails, MovieResult, MovieSummary, Paged } from "./types";

const HOUR = 3600;
const DAY = 86400;

const lang = (locale: Locale) => localeTags[locale];

const BREAKER_COOLDOWN_MS = 60_000;
let breakerOpenUntil = 0;
let warnedUnconfigured = false;

/** Test hook: closes the circuit breaker. */
export function resetCircuitBreaker() {
  breakerOpenUntil = 0;
}

/**
 * Runs a TMDB call and reports failure explicitly — KinoLand never substitutes placeholder films.
 * After a failure, a short circuit breaker makes subsequent calls fail fast instead of making
 * every page view wait on TMDB timeouts.
 */
async function live<T>(fn: () => Promise<T>): Promise<MovieResult<T>> {
  if (!isTmdbConfigured()) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      logger.warn("tmdb.not_configured", { hint: "Set TMDB_READ_ACCESS_TOKEN (or TMDB_API_KEY) in .env.local and restart." });
    }
    return { ok: false, reason: "unconfigured" };
  }
  if (Date.now() < breakerOpenUntil) return { ok: false, reason: "unavailable" };
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    breakerOpenUntil = Date.now() + BREAKER_COOLDOWN_MS;
    logger.warn("tmdb.unavailable", { error: err instanceof Error ? err.message : String(err), retryInMs: BREAKER_COOLDOWN_MS });
    return { ok: false, reason: "unavailable" };
  }
}

/** Removes titles an admin has hidden via a visibility override. */
const visible = (movies: MovieSummary[]) => {
  const hidden = hiddenMovieIds();
  return hidden.size ? movies.filter((m) => !hidden.has(m.id)) : movies;
};

const listFrom = async (path: string, locale: Locale, params: Record<string, string | number> = {}, revalidate = HOUR) => {
  const page = mapPaged(await tmdbFetch(path, { language: lang(locale), ...params }, revalidate));
  return { ...page, results: visible(page.results) };
};

export const getTrending = cache((locale: Locale) =>
  live(async () => (await listFrom("/trending/movie/week", locale)).results),
);

/**
 * TMDB's /movie/top_rated lets recent titles with a few hundred votes outrank the classics, so
 * rankings use Discover with a minimum vote count (and no documentaries / TV movies).
 */
const TOP_RATED_PARAMS = { sort_by: "vote_average.desc", "vote_count.gte": 3000, without_genres: "99,10770", include_adult: "false" };

export const getTopRatedRail = cache((locale: Locale) =>
  live(async () => (await listFrom("/discover/movie", locale, TOP_RATED_PARAMS, DAY)).results),
);

export const getNowPlaying = cache((locale: Locale) =>
  live(async () => (await listFrom("/movie/now_playing", locale)).results),
);

export const getUpcoming = cache((locale: Locale) =>
  live(async () => (await listFrom("/movie/upcoming", locale)).results),
);

export const getByGenre = cache((genre: number, locale: Locale) =>
  live(
    async () =>
      (
        await listFrom("/discover/movie", locale, {
          with_genres: genre,
          sort_by: "popularity.desc",
          "vote_count.gte": 300,
          include_adult: "false",
        })
      ).results,
  ),
);

/** The 100 highest-rated films on TMDB among titles with at least 3,000 votes. */
export const getTop100 = cache((locale: Locale) =>
  live(async () => {
    const pages = await Promise.all([1, 2, 3, 4, 5].map((page) => listFrom("/discover/movie", locale, { ...TOP_RATED_PARAMS, page }, DAY)));
    const seen = new Set<number>();
    return pages
      .flatMap((p) => p.results)
      .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
      .slice(0, 100);
  }),
);

async function fetchDetails(id: number, locale: Locale): Promise<MovieDetails | null> {
  if (hiddenMovieIds().has(id)) return null;
  let raw: unknown;
  try {
    raw = await tmdbFetch(
      `/movie/${id}`,
      {
        language: lang(locale),
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
  details.recommendations = visible(details.recommendations);
  // Many titles have no ru/kk synopsis or artwork; fill missing fields from the English record.
  if (locale !== "en" && (!details.overview || !details.tagline || !details.posterPath || !details.backdropPath)) {
    try {
      const en = mapDetails(await tmdbFetch(`/movie/${id}`, { language: "en-US" }, DAY), "en");
      if (en) {
        details.overview ||= en.overview;
        details.tagline ||= en.tagline;
        details.posterPath ??= en.posterPath;
        details.backdropPath ??= en.backdropPath;
      }
    } catch {
      /* keep the localized fields as they are */
    }
  }
  return details;
}

/** Full film record; `data: null` means TMDB has no film with this id (→ 404). */
export const getMovie = cache((id: number, locale: Locale) => live(() => fetchDetails(id, locale)));

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
export async function searchMovies(f: MovieFilters, locale: Locale): Promise<MovieResult<Paged<MovieSummary> & { mode: SearchMode }>> {
  const mode: SearchMode = f.query ? "search" : "discover";
  return live(async () => {
    if (f.query) {
      const p = await listFrom("/search/movie", locale, {
        query: f.query,
        page: f.page,
        include_adult: "false",
        ...(f.yearFrom && f.yearFrom === f.yearTo ? { primary_release_year: f.yearFrom } : {}),
      });
      return { ...p, mode, results: sortMovies(p.results.filter((m) => matchesFilters(m, f)), f.sort, locale) };
    }
    const p = await listFrom("/discover/movie", locale, {
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
    return { ...p, mode };
  });
}

/** Localized summaries for saved ids (watchlists, favourites). Ids TMDB no longer knows are skipped. */
export async function getMovieSummaries(ids: number[], locale: Locale): Promise<MovieResult<Map<number, MovieSummary>>> {
  return live(async () => {
    const out = new Map<number, MovieSummary>();
    const hidden = hiddenMovieIds();
    const queue = ids.filter((id) => !hidden.has(id)).slice(0, 120);
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
  });
}

/** Candidate pool for recommendations: top titles in the user's genres + TMDB recommendations of seed films. */
export async function getRecommendationCandidates(genres: number[], seedIds: number[], locale: Locale) {
  return live(async () => {
    const requests: Promise<Paged<MovieSummary>>[] = [];
    if (genres.length) {
      for (const page of [1, 2]) {
        requests.push(
          listFrom("/discover/movie", locale, { with_genres: genres.join("|"), sort_by: "vote_average.desc", "vote_count.gte": 800, page }, DAY),
        );
      }
    }
    for (const id of seedIds.slice(0, 3)) {
      requests.push(listFrom(`/movie/${id}/recommendations`, locale, {}, DAY).catch(() => ({ results: [], page: 1, totalPages: 1, totalResults: 0 })));
    }
    if (!requests.length) requests.push(listFrom("/trending/movie/week", locale));
    const pages = await Promise.all(requests);
    const map = new Map<number, MovieSummary>();
    for (const m of pages.flatMap((p) => p.results)) map.set(m.id, m);
    return [...map.values()];
  });
}
