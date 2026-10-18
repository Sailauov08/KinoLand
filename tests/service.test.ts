import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Configure a (fake) key before modules read the environment.
process.env.TMDB_READ_ACCESS_TOKEN = "test-token";

type Service = typeof import("@/lib/movies/service");
let service: Service;

beforeAll(async () => {
  service = await import("@/lib/movies/service");
});

afterEach(() => {
  vi.unstubAllGlobals();
  service.resetCircuitBreaker();
});

const page = (results: unknown[]) => ({ page: 1, results, total_pages: 1, total_results: results.length });
const movie = (id: number, title: string) => ({ id, title, original_title: title, release_date: "2020-01-01", vote_average: 8, vote_count: 10, genre_ids: [18], original_language: "en" });

describe("movie service (TMDB configured)", () => {
  it("returns live data and sends the bearer token + locale", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(page([movie(1, "Live film")])), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await service.getTrending("ru");
    expect(res.source).toBe("live");
    expect(res.data[0].title).toBe("Live film");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toContain("/trending/movie/week");
    expect(String(url)).toContain("language=ru-RU");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("falls back to labelled demo data when TMDB fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    const res = await service.getTop100("en");
    expect(res.source).toBe("demo");
    expect(res.notice).toBe("unavailable");
    expect(res.data.length).toBeGreaterThan(0);
  });

  it("falls back on network errors too", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const res = await service.searchMovies((await import("@/lib/movies/filters")).parseFilters({ q: "matrix" }), "en");
    expect(res.source).toBe("demo");
    expect(res.data.results.map((m) => m.id)).toContain(603);
  });

  it("returns null (not demo data) for a movie TMDB says does not exist", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
    const res = await service.getMovie(424242, "en");
    expect(res.source).toBe("live");
    expect(res.data).toBeNull();
  });

  it("uses discover with all filters when there is no text query", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(page([])), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { parseFilters } = await import("@/lib/movies/filters");
    await service.searchMovies(parseFilters({ genre: "16,14", yearFrom: "1990", yearTo: "1999", rating: "7", lang: "ja", sort: "rating" }), "en");
    const url = String((fetchMock.mock.calls[0] as unknown as [URL])[0]);
    expect(url).toContain("/discover/movie");
    expect(url).toContain("with_genres=16%2C14");
    expect(url).toContain("primary_release_date.gte=1990-01-01");
    expect(url).toContain("primary_release_date.lte=1999-12-31");
    expect(url).toContain("vote_average.gte=7");
    expect(url).toContain("with_original_language=ja");
    expect(url).toContain("sort_by=vote_average.desc");
  });

  it("opens a circuit breaker after a failure so later calls skip TMDB", async () => {
    const failing = vi.fn(async () => new Response("{}", { status: 500 }));
    vi.stubGlobal("fetch", failing);
    await service.getUpcoming("en");
    const calls = failing.mock.calls.length;
    const res = await service.getByGenre(18, "en");
    expect(res.notice).toBe("unavailable");
    expect(failing.mock.calls.length).toBe(calls);
  });
});
