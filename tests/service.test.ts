import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { parseFilters } from "@/lib/movies/filters";

// Configure a (fake) key before modules read the environment (the DB is in-memory PGlite).
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
const movie = (id: number, title: string) => ({
  id, title, original_title: title, release_date: "2020-01-01", vote_average: 8, vote_count: 10, genre_ids: [18], original_language: "en", poster_path: "/p.jpg", backdrop_path: "/b.jpg",
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("movie service (TMDB configured)", () => {
  it("returns live TMDB data and sends the bearer token + locale", async () => {
    const fetchMock = vi.fn(async () => json(page([movie(1, "Live film")])));
    vi.stubGlobal("fetch", fetchMock);
    const res = await service.getTrending("ru");
    expect(res.ok && res.data[0]).toMatchObject({ title: "Live film", posterPath: "/p.jpg", backdropPath: "/b.jpg" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toContain("/trending/movie/week");
    expect(String(url)).toContain("language=ru-RU");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("reports TMDB failures as unavailable instead of substituting content", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    expect(await service.getTop100("en")).toEqual({ ok: false, reason: "unavailable" });
  });

  it("reports network errors as unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    expect(await service.searchMovies(parseFilters({ q: "matrix" }), "en")).toEqual({ ok: false, reason: "unavailable" });
  });

  it("returns ok + null for a film TMDB says does not exist (→ 404 page)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
    expect(await service.getMovie(424242, "en")).toEqual({ ok: true, data: null });
  });

  it("fills missing localized overview and artwork from the English record", async () => {
    const ruRecord = { ...movie(5, "Фильм"), overview: "", tagline: "", poster_path: null, credits: { cast: [], crew: [{ id: 1, name: "Dir", job: "Director" }] } };
    const enRecord = { ...movie(5, "Film"), overview: "English overview", tagline: "Tag", poster_path: "/en-poster.jpg" };
    vi.stubGlobal("fetch", vi.fn(async (url: URL) => json(String(url).includes("language=ru-RU") ? ruRecord : enRecord)));
    const res = await service.getMovie(5, "ru");
    expect(res.ok && res.data).toMatchObject({ title: "Фильм", overview: "English overview", tagline: "Tag", posterPath: "/en-poster.jpg", directors: [{ id: 1, name: "Dir" }] });
  });

  it("uses discover with all filters when there is no text query", async () => {
    const fetchMock = vi.fn(async () => json(page([])));
    vi.stubGlobal("fetch", fetchMock);
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
    expect(await service.getByGenre(18, "en")).toEqual({ ok: false, reason: "unavailable" });
    expect(failing.mock.calls.length).toBe(calls);
  });
});

describe("movie service (no TMDB key)", () => {
  it("reports unconfigured without calling the network", async () => {
    vi.resetModules();
    const prevToken = process.env.TMDB_READ_ACCESS_TOKEN;
    delete process.env.TMDB_READ_ACCESS_TOKEN;
    delete process.env.TMDB_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    try {
      const fresh = await import("@/lib/movies/service");
      expect(await fresh.getTrending("en")).toEqual({ ok: false, reason: "unconfigured" });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      process.env.TMDB_READ_ACCESS_TOKEN = prevToken;
    }
  });
});
