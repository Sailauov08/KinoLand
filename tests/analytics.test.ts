import { describe, expect, it } from "vitest";
import { fillDays, parseRange, rangeBounds } from "@/lib/admin/range";
import { clientEventSchema, isBot, sanitizePath, sanitizeSearchQuery } from "@/lib/analytics/sanitize";

describe("search query privacy", () => {
  it("normalises ordinary queries", () => {
    expect(sanitizeSearchQuery("  Тёмный   РЫЦАРЬ ")).toBe("тёмный рыцарь");
    expect(sanitizeSearchQuery("Dune 2")).toBe("dune 2");
    expect(sanitizeSearchQuery("blade runner 2049")).toBe("blade runner 2049");
  });

  it("drops anything that may contain personal data", () => {
    for (const q of ["me@mail.com", "+7 701 123 45 67", "4111 1111 1111 1111", "https://evil.example", "www.site.kz", "x".repeat(81), "", 42]) {
      expect(sanitizeSearchQuery(q), String(q)).toBeNull();
    }
  });

  it("strips query strings from paths and rejects odd input", () => {
    expect(sanitizePath("/search?q=secret#x")).toBe("/search");
    expect(sanitizePath("/movie/27205")).toBe("/movie/27205");
    expect(sanitizePath("https://evil.example/")).toBeNull();
    expect(sanitizePath("/<script>")).toBeNull();
  });

  it("detects bots", () => {
    expect(isBot("Googlebot/2.1")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot("Mozilla/5.0 (Windows NT 10.0) Chrome/130")).toBe(false);
  });
});

describe("client event whitelist", () => {
  it("accepts valid events and rejects unknown or server-only types", () => {
    expect(clientEventSchema.safeParse({ type: "page_view", path: "/" }).success).toBe(true);
    expect(
      clientEventSchema.safeParse({ type: "movie_view", path: "/movie/1", movieId: 1, props: { title: "A", genres: [18], hasTrailer: true, hasProvider: false } }).success,
    ).toBe(true);
    expect(clientEventSchema.safeParse({ type: "signup_success", path: "/" }).success).toBe(false);
    expect(clientEventSchema.safeParse({ type: "watchlist_add", path: "/" }).success).toBe(false);
    expect(clientEventSchema.safeParse({ type: "movie_view", path: "/", movieId: -1, props: {} }).success).toBe(false);
  });
});

describe("admin date ranges", () => {
  it("parses ranges with a safe default", () => {
    expect(parseRange("7d")).toBe("7d");
    expect(parseRange("bogus")).toBe("30d");
  });

  it("produces one point per day including empty days", () => {
    const now = new Date(2026, 9, 18, 15, 0).getTime();
    const { from, days } = rangeBounds("7d", now);
    expect(days).toBe(7);
    expect(new Date(from).getDate()).toBe(12);
    const pts = fillDays([{ day: "2026-10-14", n: 5 }], from, days, (r) => r?.n ?? 0);
    expect(pts).toHaveLength(7);
    expect(pts.find((p) => p.day === "2026-10-14")?.value).toBe(5);
    expect(pts.filter((p) => p.value === 0)).toHaveLength(6);
  });
});
