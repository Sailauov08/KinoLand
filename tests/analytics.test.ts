import { describe, expect, it } from "vitest";
import { fillDays, parseRange, rangeBounds } from "@/lib/admin/range";
import { clientEventSchema, isBot, sanitizePath, sanitizeSearchQuery } from "@/lib/analytics/sanitize";
import { addDaysToKey, dayKeyInTz, startOfDayInTz } from "@/lib/time";

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

  it("produces one point per day (in the app time zone) including empty days", () => {
    const now = Date.UTC(2026, 9, 18, 10, 0); // 15:00 in Almaty (UTC+5)
    const { from, days } = rangeBounds("7d", "Asia/Almaty", now);
    expect(days).toBe(7);
    expect(new Date(from).toISOString()).toBe("2026-10-11T19:00:00.000Z"); // Oct 12, 00:00 Almaty
    const pts = fillDays([{ day: "2026-10-14", n: 5 }], from, days, (r) => r?.n ?? 0, "Asia/Almaty");
    expect(pts[0].day).toBe("2026-10-12");
    expect(pts[6].day).toBe("2026-10-18");
    expect(pts).toHaveLength(7);
    expect(pts.find((p) => p.day === "2026-10-14")?.value).toBe(5);
    expect(pts.filter((p) => p.value === 0)).toHaveLength(6);
  });
});

describe("time zone helpers", () => {
  it("computes calendar days and midnights across time zones", () => {
    const ts = Date.UTC(2026, 9, 18, 21, 30); // 02:30 next day in Almaty
    expect(dayKeyInTz(ts, "UTC")).toBe("2026-10-18");
    expect(dayKeyInTz(ts, "Asia/Almaty")).toBe("2026-10-19");
    expect(new Date(startOfDayInTz(ts, "Asia/Almaty")).toISOString()).toBe("2026-10-18T19:00:00.000Z");
    expect(new Date(startOfDayInTz(ts, "Europe/Berlin", 1)).toISOString()).toBe("2026-10-16T22:00:00.000Z");
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});
