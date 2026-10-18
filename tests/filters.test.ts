import { describe, expect, it } from "vitest";
import { filtersToSearchParams, matchesFilters, normalizeText, paginate, parseFilters, sortMovies } from "@/lib/movies/filters";
import type { MovieSummary } from "@/lib/movies/types";

const movie = (o: Partial<MovieSummary>): MovieSummary => ({
  id: 1,
  title: "A",
  originalTitle: "A",
  releaseDate: null,
  year: 2000,
  posterPath: null,
  backdropPath: null,
  voteAverage: 7,
  voteCount: 100,
  popularity: 1,
  genreIds: [18],
  originalLanguage: "en",
  overview: "",
  ...o,
});

describe("parseFilters", () => {
  it("parses valid params", () => {
    const f = parseFilters({ q: "  dune ", genre: "878,12", yearFrom: "1990", yearTo: "2020", rating: "7", lang: "en", sort: "rating", page: "2" });
    expect(f).toEqual({ query: "dune", genres: [878, 12], yearFrom: 1990, yearTo: 2020, ratingMin: 7, language: "en", sort: "rating", page: 2 });
  });

  it("drops invalid values instead of throwing", () => {
    const f = parseFilters({ genre: "999,abc,18", yearFrom: "10", rating: "42", lang: "english", sort: "bogus", page: "-1" });
    expect(f).toMatchObject({ genres: [18], yearFrom: null, ratingMin: null, language: null, sort: "popularity", page: 1 });
  });

  it("swaps inverted year ranges", () => {
    const f = parseFilters({ yearFrom: "2020", yearTo: "1990" });
    expect([f.yearFrom, f.yearTo]).toEqual([1990, 2020]);
  });

  it("round-trips through the query string", () => {
    const f = parseFilters({ q: "x", genre: "18", sort: "newest", page: "3" });
    expect(parseFilters(Object.fromEntries(filtersToSearchParams(f)))).toEqual(f);
  });
});

describe("matchesFilters", () => {
  const base = parseFilters({});
  it("requires every selected genre", () => {
    expect(matchesFilters(movie({ genreIds: [18, 80] }), { ...base, genres: [18, 80] })).toBe(true);
    expect(matchesFilters(movie({ genreIds: [18] }), { ...base, genres: [18, 80] })).toBe(false);
  });
  it("never lets unknown ratings pass a minimum", () => {
    expect(matchesFilters(movie({ voteAverage: null }), { ...base, ratingMin: 5 })).toBe(false);
  });
  it("filters by year range and language", () => {
    const f = { ...base, yearFrom: 1990, yearTo: 1999, language: "ja" };
    expect(matchesFilters(movie({ year: 1995, originalLanguage: "ja" }), f)).toBe(true);
    expect(matchesFilters(movie({ year: 2001, originalLanguage: "ja" }), f)).toBe(false);
    expect(matchesFilters(movie({ year: 1995, originalLanguage: "en" }), f)).toBe(false);
  });
});

describe("sortMovies", () => {
  const list = [movie({ id: 1, voteAverage: null, year: 1980, title: "Б" }), movie({ id: 2, voteAverage: 8, year: 2010, title: "А" }), movie({ id: 3, voteAverage: 9, year: null, title: "В" })];
  it("sorts by rating with unknowns last", () => {
    expect(sortMovies(list, "rating").map((m) => m.id)).toEqual([3, 2, 1]);
  });
  it("sorts by year with unknowns last in both directions", () => {
    expect(sortMovies(list, "newest").map((m) => m.id)).toEqual([2, 1, 3]);
    expect(sortMovies(list, "oldest").map((m) => m.id)).toEqual([1, 2, 3]);
  });
  it("sorts titles with locale collation", () => {
    expect(sortMovies(list, "title", "ru").map((m) => m.title)).toEqual(["А", "Б", "В"]);
  });
});

describe("helpers", () => {
  it("normalizes diacritics, case and ё", () => {
    expect(normalizeText("Amélie")).toBe("amelie");
    expect(normalizeText("Тёмный  РЫЦАРЬ!")).toBe("темный рыцарь");
  });
  it("paginates and clamps the page", () => {
    const p = paginate([1, 2, 3, 4, 5], 9, 2);
    expect(p).toEqual({ results: [5], page: 3, totalPages: 3, totalResults: 5 });
  });
});
