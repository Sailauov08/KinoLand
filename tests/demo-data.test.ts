import { describe, expect, it } from "vitest";
import { DEMO_MOVIES } from "@/lib/movies/demo-data";
import { demoDetails, demoDiscover } from "@/lib/movies/demo-provider";
import { parseFilters } from "@/lib/movies/filters";
import { GENRE_IDS } from "@/lib/movies/genres";

describe("demo catalogue", () => {
  it("has unique ids and valid genres", () => {
    expect(new Set(DEMO_MOVIES.map((m) => m.id)).size).toBe(DEMO_MOVIES.length);
    for (const m of DEMO_MOVIES) for (const g of m.genres) expect(GENRE_IDS.has(g), `${m.title.en}:${g}`).toBe(true);
  });

  it("never fabricates ratings, posters or trailers", () => {
    const d = demoDetails(278, "en")!;
    expect(d.voteAverage).toBeNull();
    expect(d.posterPath).toBeNull();
    expect(d.trailer).toBeNull();
  });

  it("searches across English, Russian and original titles and people", () => {
    expect(demoDiscover(parseFilters({ q: "сталкер" }), "ru").results.map((m) => m.id)).toEqual([1398]);
    expect(demoDiscover(parseFilters({ q: "amelie" }), "en").results.map((m) => m.id)).toEqual([194]);
    expect(demoDiscover(parseFilters({ q: "千と千尋" }), "en").results.map((m) => m.id)).toEqual([129]);
    expect(demoDiscover(parseFilters({ q: "nolan" }), "en").totalResults).toBeGreaterThan(0);
  });

  it("applies genre/language filters", () => {
    const res = demoDiscover(parseFilters({ genre: "16", lang: "ja" }), "en");
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results.every((m) => m.genreIds.includes(16) && m.originalLanguage === "ja")).toBe(true);
  });

  it("localizes Russian titles and falls back to English for Kazakh", () => {
    expect(demoDetails(155, "ru")!.title).toBe("Тёмный рыцарь");
    expect(demoDetails(155, "kk")!.title).toBe("The Dark Knight");
  });
});
