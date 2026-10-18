/** Why movie data could not be loaded: no TMDB credentials, or TMDB failed / timed out. */
export type UnavailableReason = "unconfigured" | "unavailable";

/** Outcome of a TMDB-backed call. There is no substitute content: either real data or a reason. */
export type MovieResult<T> = { ok: true; data: T } | { ok: false; reason: UnavailableReason };

export interface MovieSummary {
  id: number;
  title: string;
  originalTitle: string;
  releaseDate: string | null;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  /** TMDB community score 0–10. Null when TMDB has no votes for the title. */
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  genreIds: number[];
  originalLanguage: string;
  overview: string;
}

export interface Person {
  id: number;
  name: string;
}

export interface CastMember extends Person {
  character: string;
  profilePath: string | null;
}

export interface Trailer {
  key: string;
  name: string;
  official: boolean;
}

export interface MovieDetails extends MovieSummary {
  runtime: number | null;
  tagline: string;
  directors: Person[];
  cast: CastMember[];
  trailer: Trailer | null;
  spokenLanguages: string[];
  productionCountries: string[];
  homepage: string | null;
  imdbId: string | null;
  recommendations: MovieSummary[];
}

export interface Paged<T> {
  results: T[];
  page: number;
  totalPages: number;
  totalResults: number;
}

/** Minimal copy of a movie stored with list/collection rows so lists render without API calls. */
export interface MovieSnapshot {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number | null;
  genreIds: number[];
  originalLanguage: string;
}

export const toSnapshot = (m: MovieSummary): MovieSnapshot => ({
  id: m.id,
  title: m.title,
  year: m.year,
  posterPath: m.posterPath,
  backdropPath: m.backdropPath,
  voteAverage: m.voteAverage,
  genreIds: m.genreIds,
  originalLanguage: m.originalLanguage,
});

export const fromSnapshot = (s: MovieSnapshot): MovieSummary => ({
  ...s,
  originalTitle: s.title,
  releaseDate: null,
  voteCount: null,
  popularity: null,
  overview: "",
});
