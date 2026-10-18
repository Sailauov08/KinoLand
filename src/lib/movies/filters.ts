/**
 * Search/discover filter parsing and in-memory filtering/sorting. Pure functions, shared by
 * the live (post-filtering search results, Top 100) and demo providers.
 */
import { z } from "zod";
import { GENRE_IDS } from "./genres";
import type { MovieSummary } from "./types";

export const SORTS = ["popularity", "rating", "newest", "oldest", "title"] as const;
export type SortKey = (typeof SORTS)[number];

export interface MovieFilters {
  query: string;
  genres: number[];
  yearFrom: number | null;
  yearTo: number | null;
  ratingMin: number | null;
  language: string | null;
  sort: SortKey;
  page: number;
}

const CURRENT_YEAR = new Date().getFullYear();

const yearSchema = z.coerce.number().int().min(1888).max(CURRENT_YEAR + 5);

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Parses URL search params into validated filters; invalid values are dropped, never thrown. */
export function parseFilters(params: RawParams, defaults: Partial<MovieFilters> = {}): MovieFilters {
  const query = (first(params.q) ?? "").trim().slice(0, 100);

  const rawGenres = params.genre ?? params.genres;
  const genreList = (Array.isArray(rawGenres) ? rawGenres : (rawGenres ?? "").split(","))
    .map((g) => Number(g))
    .filter((g) => GENRE_IDS.has(g));

  const yf = yearSchema.safeParse(first(params.yearFrom));
  const yt = yearSchema.safeParse(first(params.yearTo));
  let yearFrom = yf.success ? yf.data : null;
  let yearTo = yt.success ? yt.data : null;
  if (yearFrom && yearTo && yearFrom > yearTo) [yearFrom, yearTo] = [yearTo, yearFrom];

  const rating = z.coerce.number().min(0).max(10).safeParse(first(params.rating));
  const lang = first(params.lang);
  const sort = z.enum(SORTS).safeParse(first(params.sort));
  const page = z.coerce.number().int().min(1).max(500).safeParse(first(params.page));

  return {
    query,
    genres: [...new Set(genreList)],
    yearFrom,
    yearTo,
    ratingMin: rating.success && rating.data > 0 ? rating.data : null,
    language: lang && /^[a-z]{2}$/.test(lang) ? lang : null,
    sort: sort.success ? sort.data : (defaults.sort ?? "popularity"),
    page: page.success ? page.data : 1,
  };
}

export function hasActiveFilters(f: MovieFilters): boolean {
  return Boolean(f.genres.length || f.yearFrom || f.yearTo || f.ratingMin || f.language);
}

/** Serialises filters back to a query string (omits defaults). */
export function filtersToSearchParams(f: Partial<MovieFilters>): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.query) sp.set("q", f.query);
  if (f.genres?.length) sp.set("genre", f.genres.join(","));
  if (f.yearFrom) sp.set("yearFrom", String(f.yearFrom));
  if (f.yearTo) sp.set("yearTo", String(f.yearTo));
  if (f.ratingMin) sp.set("rating", String(f.ratingMin));
  if (f.language) sp.set("lang", f.language);
  if (f.sort && f.sort !== "popularity") sp.set("sort", f.sort);
  if (f.page && f.page > 1) sp.set("page", String(f.page));
  return sp;
}

export function matchesFilters(m: MovieSummary, f: MovieFilters): boolean {
  if (f.genres.length && !f.genres.every((g) => m.genreIds.includes(g))) return false;
  if (f.yearFrom && (m.year === null || m.year < f.yearFrom)) return false;
  if (f.yearTo && (m.year === null || m.year > f.yearTo)) return false;
  // Unknown ratings never satisfy a minimum-rating filter.
  if (f.ratingMin && (m.voteAverage === null || m.voteAverage < f.ratingMin)) return false;
  if (f.language && m.originalLanguage !== f.language) return false;
  return true;
}

export function sortMovies(list: MovieSummary[], sort: SortKey, locale = "en"): MovieSummary[] {
  const copy = list.slice();
  const nullsLast = (a: number | null, b: number | null, dir: 1 | -1) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return (a - b) * dir;
  };
  switch (sort) {
    case "rating":
      return copy.sort((a, b) => nullsLast(a.voteAverage, b.voteAverage, -1) || nullsLast(a.voteCount, b.voteCount, -1));
    case "newest":
      return copy.sort((a, b) => nullsLast(a.year, b.year, -1));
    case "oldest":
      return copy.sort((a, b) => nullsLast(a.year, b.year, 1));
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title, locale));
    case "popularity":
    default:
      return copy; // keep provider order (already popularity-ranked)
  }
}

/** Case/diacritic-insensitive normalisation for local title search. */
export function normalizeText(s: string): string {
  return s
    .toLocaleLowerCase()
    // Strip accents from Latin letters only — Cyrillic й/ё/қ etc. must keep their marks.
    .normalize("NFD")
    .replace(/([a-z])\p{M}+/gu, "$1")
    .normalize("NFC")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    results: items.slice((safePage - 1) * perPage, safePage * perPage),
    page: safePage,
    totalPages,
    totalResults: items.length,
  };
}
