import { beforeAll, describe, expect, it } from "vitest";

// Uses an in-memory PGlite Postgres (EMBEDDED_DB_DIR=memory, see vitest.config.mts) with the real schema.
type Users = typeof import("@/lib/db/users");
type Lists = typeof import("@/lib/db/lists");
type Events = typeof import("@/lib/db/events");
type Audit = typeof import("@/lib/db/audit");
type Content = typeof import("@/lib/db/content");
type Db = typeof import("@/lib/db");
let users: Users, lists: Lists, events: Events, audit: Audit, content: Content, db: Db;

const snap = (id: number) => ({ id, title: `Film ${id}`, year: 2000, posterPath: null, backdropPath: null, voteAverage: null, genreIds: [18], originalLanguage: "en" });

beforeAll(async () => {
  db = await import("@/lib/db");
  users = await import("@/lib/db/users");
  lists = await import("@/lib/db/lists");
  events = await import("@/lib/db/events");
  audit = await import("@/lib/db/audit");
  content = await import("@/lib/db/content");
});

describe("schema", () => {
  it("migrates into the private kinoland schema with row level security on every table", async () => {
    const tables = await db.q<{ tablename: string; rowsecurity: boolean }>("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'kinoland' ORDER BY tablename");
    expect(tables.map((t) => t.tablename)).toEqual(
      expect.arrayContaining(["users", "sessions", "list_items", "events", "audit_log", "banners", "hidden_movies", "provider_links", "rate_limits", "schema_migrations"]),
    );
    expect(tables.every((t) => t.rowsecurity)).toBe(true);
    expect(await db.count("SELECT COUNT(*)::int AS n FROM pg_tables WHERE schemaname = 'public'")).toBe(0);
  });

  it("is idempotent when migrations run again", async () => {
    await db.migrate(await db.getDb());
    expect(await db.count("SELECT COUNT(*)::int AS n FROM kinoland.schema_migrations")).toBe(1);
  });
});

describe("users", () => {
  it("always creates regular active users with lowercase unique emails", async () => {
    const u = await users.createUser({ email: "Test@Example.com", name: "Test", passwordHash: "x", locale: "kk" });
    expect(u).toMatchObject({ email: "test@example.com", role: "user", status: "active", preferredGenres: [] });
    await expect(users.createUser({ email: "test@example.com", name: "Dup", passwordHash: "x", locale: "en" })).rejects.toThrow();
  });

  it("paginates, filters, searches (with escaped wildcards) and sorts", async () => {
    for (let i = 0; i < 25; i++) await users.createUser({ email: `bulk${i}@example.test`, name: `Bulk ${String(i).padStart(2, "0")}`, passwordHash: "x", locale: "en" });
    const p1 = await users.listUsersPaged({ perPage: 10, sort: "name" });
    expect(p1.items).toHaveLength(10);
    expect(p1.total).toBe(26);
    expect(p1.totalPages).toBe(3);
    expect(p1.items[0].name).toBe("Bulk 00");
    expect((await users.listUsersPaged({ query: "bulk1", perPage: 50 })).total).toBe(11);
    expect((await users.listUsersPaged({ query: "%" })).total).toBe(0);
    expect((await users.listUsersPaged({ page: 999, perPage: 10 })).page).toBe(3);
  });

  it("tracks status, role, last activity, active admins and profile genres", async () => {
    const u = (await users.findUserByEmail("test@example.com"))!;
    await users.setUserStatus(u.id, "suspended");
    expect((await users.findUserById(u.id))?.status).toBe("suspended");
    expect((await users.listUsersPaged({ status: "suspended" })).total).toBe(1);
    await users.setUserStatus(u.id, "active");
    expect(await users.countActiveAdmins()).toBe(0);
    await users.setUserRole(u.id, "admin");
    expect(await users.countActiveAdmins()).toBe(1);
    await users.touchLastSeen(u.id, null, 1_000_000);
    await users.touchLastSeen(u.id, 1_000_000, 1_000_000 + 60_000); // throttled (< 5 min)
    expect((await users.findUserById(u.id))?.lastSeenAt).toBe(1_000_000);
    await users.updateUserProfile(u.id, { name: "Renamed", preferredGenres: [878, 18], locale: "ru" });
    expect(await users.findUserById(u.id)).toMatchObject({ name: "Renamed", preferredGenres: [878, 18], locale: "ru" });
    const stats = await users.getUserStats();
    expect(stats.total).toBe(26);
    expect(stats.newToday).toBe(26);
  });
});

describe("lists are per-user", () => {
  it("never mixes two users' lists", async () => {
    const a = (await users.findUserByEmail("bulk1@example.test"))!;
    const b = (await users.findUserByEmail("bulk2@example.test"))!;
    await lists.addToList(a.id, "watchlist", snap(10));
    await lists.addToList(a.id, "watchlist", snap(10));
    await lists.addToList(b.id, "favorite", snap(20));
    expect(await lists.getAllMemberIds(a.id)).toEqual({ watchlist: [10], favorite: [] });
    expect(await lists.getAllMemberIds(b.id)).toEqual({ watchlist: [], favorite: [20] });
    expect((await lists.getList(a.id, "watchlist"))[0].snapshot.title).toBe("Film 10");
    await lists.removeFromList(a.id, "watchlist", 10);
    expect(await lists.isInList(a.id, "watchlist", 10)).toBe(false);
  });
});

describe("analytics events", () => {
  it("records events and aggregates them by range", async () => {
    const now = Date.now();
    const v1 = await events.visitorHash("1.2.3.4", "UA", now);
    expect(await events.visitorHash("1.2.3.4", "UA", now)).toBe(v1);
    expect(v1).toMatch(/^[a-f0-9]{32}$/);
    await events.recordEvent({ type: "page_view", visitorHash: v1, path: "/" });
    await events.recordEvent({ type: "page_view", visitorHash: v1, path: "/top" });
    await events.recordEvent({ type: "page_view", visitorHash: await events.visitorHash("5.6.7.8", "UA", now), path: "/" });
    await events.recordEvent({ type: "movie_view", movieId: 27205, props: { title: "Inception", genres: [28, 878], hasTrailer: true, hasProvider: false } });
    await events.recordEvent({ type: "movie_view", movieId: 27205, props: { title: "Inception", genres: [28, 878], hasTrailer: true, hasProvider: false } });
    await events.recordEvent({ type: "movie_search", props: { query: "dune", results: 0, mode: "search" } });
    await events.recordEvent({ type: "page_view", path: "/old", at: now - 40 * 86_400_000 });
    const r = { from: now - 86_400_000, to: now + 1000 };
    expect(await events.countEvents("page_view", r)).toBe(3);
    expect(await events.uniqueVisitors(r)).toBe(2);
    expect(await events.topMovies("movie_view", r)).toEqual([{ movieId: 27205, title: "Inception", count: 2 }]);
    expect((await events.genreCounts(r)).map((g) => g.genreId).sort()).toEqual([28, 878]);
    expect(await events.topSearches(r)).toEqual([{ query: "dune", count: 1, zeroResults: 1 }]);
    expect(await events.playbackAvailability(r)).toEqual({ withTrailer: 2, withoutTrailer: 0, withProvider: 0, withoutProvider: 2 });
    expect((await events.visitsByDay(r)).reduce((a, d) => a + d.views, 0)).toBe(3);
    expect(await events.deleteEventsBefore(now - 30 * 86_400_000)).toBe(1);
  });
});

describe("audit log, content and rate limits", () => {
  it("appends audit entries newest first", async () => {
    await audit.logAudit({ actorId: null, action: "test.one" });
    await audit.logAudit({ actorId: null, action: "test.two", targetType: "user", targetId: "abc", details: { x: 1 } });
    const res = await audit.listAudit();
    expect(res.items[0]).toMatchObject({ action: "test.two", details: { x: 1 } });
    expect((await audit.listAudit({ targetId: "abc" })).total).toBe(1);
  });

  it("manages banners, hidden movies and provider links", async () => {
    const id = await content.saveBanner({ movieId: 1398, headline: { en: "Pick" }, description: { ru: "Строка" }, isActive: true, position: 0 });
    expect(await content.bannerOfTheDay()).toMatchObject({ id, movieId: 1398, description: { ru: "Строка" } });
    await content.deleteBanner(id);
    expect(await content.listBanners()).toHaveLength(0);
    await content.hideMovie(550, "test");
    expect((await content.hiddenMovieIds()).has(550)).toBe(true);
    await content.unhideMovie(550);
    expect((await content.hiddenMovieIds()).has(550)).toBe(false);
    await content.upsertProviderLink({ movieId: 27205, provider: "Example", url: "https://example.com/a", region: "KZ" });
    await content.upsertProviderLink({ movieId: 27205, provider: "Example", url: "https://example.com/b", region: null });
    const links = await content.listProviderLinks(27205);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("https://example.com/b");
    expect((await content.deleteProviderLink(links[0].id))?.provider).toBe("Example");
  });

  it("enforces the shared rate limit window", async () => {
    const { rateLimitShared } = await import("@/lib/auth/rate-limit");
    const key = `t:${Math.random()}`;
    expect([await rateLimitShared(key, 2, 1000, 0), await rateLimitShared(key, 2, 1000, 1), await rateLimitShared(key, 2, 1000, 2)]).toEqual([true, true, false]);
    expect(await rateLimitShared(key, 2, 1000, 1001)).toBe(true);
  });
});
