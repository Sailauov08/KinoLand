import { describe, expect, it } from "vitest";
import { mapDetails, mapMovie, mapPaged, pickTrailer } from "@/lib/movies/tmdb-schema";

const rawMovie = {
  adult: false,
  backdrop_path: "/bd.jpg",
  genre_ids: [18, 80],
  id: 278,
  original_language: "en",
  original_title: "The Shawshank Redemption",
  overview: "Overview text",
  popularity: 120.5,
  poster_path: "/p.jpg",
  release_date: "1994-09-23",
  title: "Побег из Шоушенка",
  vote_average: 8.7,
  vote_count: 28000,
};

describe("mapMovie", () => {
  it("maps TMDB list items to domain summaries", () => {
    const m = mapMovie(rawMovie)!;
    expect(m).toMatchObject({ id: 278, year: 1994, title: "Побег из Шоушенка", voteAverage: 8.7, genreIds: [18, 80], posterPath: "/p.jpg" });
  });

  it("treats a score with zero votes as unknown instead of 0", () => {
    expect(mapMovie({ ...rawMovie, vote_count: 0, vote_average: 0 })!.voteAverage).toBeNull();
  });

  it("drops adult titles and malformed rows", () => {
    expect(mapMovie({ ...rawMovie, adult: true })).toBeNull();
    expect(mapMovie({ title: "no id" })).toBeNull();
  });

  it("handles missing dates and images", () => {
    const m = mapMovie({ id: 1, title: "X", release_date: "", poster_path: null })!;
    expect(m.year).toBeNull();
    expect(m.posterPath).toBeNull();
  });
});

describe("mapPaged", () => {
  it("filters invalid rows and caps total pages at 500", () => {
    const p = mapPaged({ page: 1, results: [rawMovie, { bad: true }], total_pages: 9000, total_results: 10 });
    expect(p.results).toHaveLength(1);
    expect(p.totalPages).toBe(500);
  });
});

describe("pickTrailer", () => {
  const v = (o: Partial<{ key: string; type: string; official: boolean; iso_639_1: string; site: string }>) => ({
    key: "k",
    name: "n",
    site: "YouTube",
    type: "Trailer",
    official: false,
    iso_639_1: "en",
    ...o,
  });

  it("prefers official trailers in the UI language", () => {
    const t = pickTrailer([v({ key: "en-official", official: true }), v({ key: "ru-official", official: true, iso_639_1: "ru" }), v({ key: "teaser", type: "Teaser" })], "ru");
    expect(t?.key).toBe("ru-official");
  });

  it("ignores non-YouTube and non-trailer videos", () => {
    expect(pickTrailer([v({ site: "Vimeo" }), v({ type: "Featurette" })], "en")).toBeNull();
  });
});

describe("mapDetails", () => {
  it("extracts directors, ordered cast, runtime and recommendations", () => {
    const d = mapDetails(
      {
        ...rawMovie,
        genres: [{ id: 18, name: "Drama" }],
        runtime: 142,
        tagline: "Fear can hold you prisoner.",
        imdb_id: "tt0111161",
        spoken_languages: [{ iso_639_1: "en", english_name: "English" }],
        production_countries: [{ iso_3166_1: "US", name: "United States of America" }],
        credits: {
          cast: [
            { id: 2, name: "Morgan Freeman", character: "Red", order: 1, profile_path: null },
            { id: 1, name: "Tim Robbins", character: "Andy", order: 0, profile_path: "/t.jpg" },
          ],
          crew: [
            { id: 9, name: "Frank Darabont", job: "Director" },
            { id: 10, name: "Someone", job: "Producer" },
          ],
        },
        videos: { results: [{ key: "abc123XYZ", name: "Trailer", site: "YouTube", type: "Trailer", official: true, iso_639_1: "en" }] },
        recommendations: { page: 1, results: [{ ...rawMovie, id: 238 }], total_pages: 1, total_results: 1 },
      },
      "en",
    )!;
    expect(d.runtime).toBe(142);
    expect(d.directors).toEqual([{ id: 9, name: "Frank Darabont" }]);
    expect(d.cast.map((c) => c.name)).toEqual(["Tim Robbins", "Morgan Freeman"]);
    expect(d.trailer?.key).toBe("abc123XYZ");
    expect(d.recommendations.map((r) => r.id)).toEqual([238]);
    expect(d.genreIds).toEqual([18, 80]);
  });
});
