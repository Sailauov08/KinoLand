/**
 * Zod schemas + mappers for TMDB v3 responses. Pure module (no I/O) so it can be unit tested.
 * Schemas are deliberately lenient: unknown fields are dropped, missing optional fields get defaults.
 */
import { z } from "zod";
import type { CastMember, MovieDetails, MovieSummary, Paged, Trailer } from "./types";

const nullableString = z.string().nullish().transform((v) => v ?? null);

export const tmdbMovieSchema = z.object({
  id: z.number().int(),
  title: z.string().default(""),
  original_title: z.string().default(""),
  release_date: z.string().nullish(),
  poster_path: nullableString,
  backdrop_path: nullableString,
  vote_average: z.number().nullish(),
  vote_count: z.number().nullish(),
  popularity: z.number().nullish(),
  genre_ids: z.array(z.number()).optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  original_language: z.string().default(""),
  overview: z.string().nullish(),
  adult: z.boolean().optional(),
});

export const tmdbPagedSchema = z.object({
  page: z.number().default(1),
  results: z.array(z.unknown()).default([]),
  total_pages: z.number().default(1),
  total_results: z.number().default(0),
});

const castSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: z.string().nullish(),
  profile_path: nullableString,
  order: z.number().optional(),
});

const crewSchema = z.object({
  id: z.number(),
  name: z.string(),
  job: z.string().nullish(),
});

const videoSchema = z.object({
  key: z.string(),
  name: z.string().default(""),
  site: z.string(),
  type: z.string(),
  official: z.boolean().default(false),
  iso_639_1: z.string().nullish(),
  published_at: z.string().nullish(),
});

export const tmdbDetailsSchema = tmdbMovieSchema.extend({
  runtime: z.number().nullish(),
  tagline: z.string().nullish(),
  homepage: z.string().nullish(),
  imdb_id: z.string().nullish(),
  spoken_languages: z.array(z.object({ iso_639_1: z.string(), english_name: z.string().optional() })).default([]),
  production_countries: z.array(z.object({ iso_3166_1: z.string(), name: z.string() })).default([]),
  credits: z.object({ cast: z.array(castSchema).default([]), crew: z.array(crewSchema).default([]) }).optional(),
  videos: z.object({ results: z.array(videoSchema).default([]) }).optional(),
  recommendations: tmdbPagedSchema.optional(),
});

function yearOf(date: string | null | undefined): number | null {
  if (!date) return null;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) && y > 1800 ? y : null;
}

export function mapMovie(raw: unknown): MovieSummary | null {
  const parsed = tmdbMovieSchema.safeParse(raw);
  if (!parsed.success) return null;
  const m = parsed.data;
  if (m.adult) return null;
  const voteCount = m.vote_count ?? null;
  return {
    id: m.id,
    title: m.title || m.original_title,
    originalTitle: m.original_title || m.title,
    releaseDate: m.release_date || null,
    year: yearOf(m.release_date),
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    // A score with no votes is meaningless — expose it as unknown.
    voteAverage: voteCount ? (m.vote_average ?? null) : null,
    voteCount,
    popularity: m.popularity ?? null,
    genreIds: m.genre_ids ?? m.genres?.map((g) => g.id) ?? [],
    originalLanguage: m.original_language,
    overview: m.overview ?? "",
  };
}

export function mapPaged(raw: unknown): Paged<MovieSummary> {
  const p = tmdbPagedSchema.parse(raw);
  return {
    page: p.page,
    // TMDB caps paging at 500 pages.
    totalPages: Math.min(p.total_pages, 500),
    totalResults: p.total_results,
    results: p.results.map(mapMovie).filter((m): m is MovieSummary => m !== null),
  };
}

/** Prefers official YouTube trailers in the UI language, then English, then any trailer/teaser. */
export function pickTrailer(videos: z.infer<typeof videoSchema>[], language: string): Trailer | null {
  const yt = videos.filter((v) => v.site === "YouTube");
  const score = (v: z.infer<typeof videoSchema>) =>
    (v.type === "Trailer" ? 100 : v.type === "Teaser" ? 40 : 0) +
    (v.official ? 30 : 0) +
    (v.iso_639_1 === language ? 20 : v.iso_639_1 === "en" ? 10 : 0);
  const best = yt
    .filter((v) => v.type === "Trailer" || v.type === "Teaser")
    .sort((a, b) => score(b) - score(a))[0];
  return best ? { key: best.key, name: best.name, official: best.official } : null;
}

export function mapDetails(raw: unknown, language: string): MovieDetails | null {
  const parsed = tmdbDetailsSchema.safeParse(raw);
  if (!parsed.success) return null;
  const d = parsed.data;
  const summary = mapMovie(raw);
  if (!summary) return null;
  const cast: CastMember[] = (d.credits?.cast ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, 18)
    .map((c) => ({ id: c.id, name: c.name, character: c.character ?? "", profilePath: c.profile_path }));
  const directors = (d.credits?.crew ?? [])
    .filter((c) => c.job === "Director")
    .map((c) => ({ id: c.id, name: c.name }));
  return {
    ...summary,
    runtime: d.runtime || null,
    tagline: d.tagline ?? "",
    directors,
    cast,
    trailer: pickTrailer(d.videos?.results ?? [], language),
    spokenLanguages: d.spoken_languages.map((l) => l.iso_639_1),
    productionCountries: d.production_countries.map((c) => c.iso_3166_1),
    homepage: d.homepage || null,
    imdbId: d.imdb_id || null,
    recommendations: d.recommendations ? mapPaged(d.recommendations).results.slice(0, 18) : [],
  };
}
