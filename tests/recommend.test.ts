import { describe, expect, it } from "vitest";
import { genreAffinity, rankRecommendations, topGenres } from "@/lib/movies/recommend";
import type { MovieSnapshot, MovieSummary } from "@/lib/movies/types";

const snap = (id: number, genreIds: number[]): MovieSnapshot => ({
  id, title: `m${id}`, year: 2000, posterPath: null, backdropPath: null, voteAverage: 7, genreIds, originalLanguage: "en",
});
const cand = (id: number, genreIds: number[], voteAverage: number | null = 7): MovieSummary => ({
  ...snap(id, genreIds), voteAverage, originalTitle: "", releaseDate: null, voteCount: 1, popularity: 1, overview: "",
});

describe("recommendations", () => {
  it("weights preferred genres above favourites above watchlist", () => {
    const a = genreAffinity({ preferredGenres: [878], favorites: [snap(1, [18])], watchlist: [snap(2, [35])] });
    expect(topGenres(a)).toEqual([878, 18, 35]);
    expect(a.get(878)).toBe(1);
  });

  it("excludes saved titles, requires a genre match and ranks by match then rating", () => {
    const taste = { preferredGenres: [878], favorites: [snap(10, [878, 12])], watchlist: [] };
    const ranked = rankRecommendations(
      [cand(10, [878]), cand(1, [878, 12], 6), cand(2, [878], 9), cand(3, [35], 10), cand(1, [878, 12], 6)],
      taste,
    );
    expect(ranked.map((r) => r.movie.id)).toEqual([1, 2]);
    expect(ranked[0].matchedGenres).toEqual([878, 12]);
  });

  it("returns candidates by rating when there is no taste signal", () => {
    const ranked = rankRecommendations([cand(1, [35], 5), cand(2, [18], 9)], { preferredGenres: [], favorites: [], watchlist: [] });
    expect(ranked.map((r) => r.movie.id)).toEqual([2, 1]);
  });
});
