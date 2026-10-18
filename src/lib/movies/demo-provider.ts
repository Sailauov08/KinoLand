/** Demo catalogue queries — pure, synchronous, mirrors the live service's shapes. */
import type { Locale } from "@/lib/i18n/config";
import { DEMO_MOVIES, type DemoMovie } from "./demo-data";
import { matchesFilters, normalizeText, paginate, sortMovies, type MovieFilters } from "./filters";
import type { MovieDetails, MovieSummary, Paged } from "./types";

const PER_PAGE = 20;

/** Kazakh content falls back to English (TMDB behaves the same when no kk translation exists). */
const pick = (v: { en: string; ru: string }, locale: Locale) => (locale === "ru" ? v.ru : v.en);

export function demoSummary(m: DemoMovie, locale: Locale): MovieSummary {
  return {
    id: m.id,
    title: pick(m.title, locale),
    originalTitle: m.originalTitle,
    releaseDate: null,
    year: m.year,
    posterPath: null,
    backdropPath: null,
    voteAverage: null,
    voteCount: null,
    popularity: null,
    genreIds: m.genres,
    originalLanguage: m.lang,
    overview: pick(m.overview, locale),
  };
}

const all = (locale: Locale) => DEMO_MOVIES.map((m) => demoSummary(m, locale));

export function demoDetails(id: number, locale: Locale): MovieDetails | null {
  const m = DEMO_MOVIES.find((x) => x.id === id);
  if (!m) return null;
  const summary = demoSummary(m, locale);
  return {
    ...summary,
    runtime: m.runtime,
    tagline: "",
    // Demo people have no TMDB person ids; negative synthetic ids keep React keys unique.
    directors: m.directors.map((name, i) => ({ id: -(i + 1), name })),
    cast: m.cast.map((name, i) => ({ id: -(i + 100), name, character: "", profilePath: null })),
    trailer: null,
    spokenLanguages: [m.lang],
    productionCountries: [],
    homepage: null,
    imdbId: null,
    recommendations: demoSimilar(m, locale),
  };
}

function demoSimilar(m: DemoMovie, locale: Locale): MovieSummary[] {
  return DEMO_MOVIES.filter((x) => x.id !== m.id)
    .map((x) => ({ x, overlap: x.genres.filter((g) => m.genres.includes(g)).length }))
    .filter((r) => r.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.x.year - a.x.year)
    .slice(0, 12)
    .map((r) => demoSummary(r.x, locale));
}

export const demoTrending = (locale: Locale) =>
  all(locale).slice().sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).slice(0, 20);

/** Curated order of the demo catalogue (no ratings exist to rank by). */
export const demoTopList = (locale: Locale) => all(locale);

export const demoByGenre = (genre: number, locale: Locale) => all(locale).filter((m) => m.genreIds.includes(genre));

export function demoDiscover(f: MovieFilters, locale: Locale): Paged<MovieSummary> {
  let list = all(locale);
  if (f.query) {
    const q = normalizeText(f.query);
    const byId = new Map(DEMO_MOVIES.map((m) => [m.id, m]));
    list = list.filter((m) => {
      const src = byId.get(m.id)!;
      return [src.title.en, src.title.ru, src.originalTitle, ...src.directors, ...src.cast].some((t) =>
        normalizeText(t).includes(q),
      );
    });
  }
  list = sortMovies(list.filter((m) => matchesFilters(m, f)), f.sort, locale);
  return paginate(list, f.page, PER_PAGE);
}

export const demoMoviesByIds = (ids: number[], locale: Locale) =>
  ids.map((id) => DEMO_MOVIES.find((m) => m.id === id)).filter((m): m is DemoMovie => !!m).map((m) => demoSummary(m, locale));
