import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Each run uses a throwaway database file; env is read at import time, so set it first.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kinoland-test-"));
const dbFile = path.join(dir, "test.db");
process.env.DATABASE_PATH = dbFile;

/** Simulates a v1 database (pre-upgrade) with real-looking data, to verify the migration is additive. */
function seedV1Database() {
  const db = new DatabaseSync(dbFile);
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')), preferred_genres TEXT NOT NULL DEFAULT '[]', locale TEXT, created_at INTEGER NOT NULL);
    CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
    CREATE INDEX sessions_user_idx ON sessions(user_id);
    CREATE TABLE list_items (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, list TEXT NOT NULL CHECK (list IN ('watchlist','favorite')),
      movie_id INTEGER NOT NULL, snapshot TEXT NOT NULL, added_at INTEGER NOT NULL, PRIMARY KEY (user_id, list, movie_id));
    CREATE TABLE collections (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '{}',
      is_published INTEGER NOT NULL DEFAULT 0, is_featured INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE collection_items (collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE, movie_id INTEGER NOT NULL, position INTEGER NOT NULL, snapshot TEXT NOT NULL, PRIMARY KEY (collection_id, movie_id));
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO users VALUES ('11111111-1111-4111-8111-111111111111', 'legacy@example.test', 'Legacy', 'scrypt$x', 'admin', '[18]', 'ru', 1700000000000);
    INSERT INTO list_items VALUES ('11111111-1111-4111-8111-111111111111', 'watchlist', 278, '{"id":278,"title":"The Shawshank Redemption","year":1994,"posterPath":null,"backdropPath":null,"voteAverage":8.7,"genreIds":[18,80],"originalLanguage":"en"}', 1700000000000);
    INSERT INTO collections (slug, title, created_at, updated_at) VALUES ('old', '{"en":"Old"}', 1, 1);
    INSERT INTO settings VALUES ('spotlight', '{"movieId":1398,"tagline":{"en":"Editorial line"}}');
    PRAGMA user_version = 1;
  `);
  db.close();
}

type Users = typeof import("@/lib/db/users");
type Lists = typeof import("@/lib/db/lists");
type Events = typeof import("@/lib/db/events");
type Audit = typeof import("@/lib/db/audit");
type Content = typeof import("@/lib/db/content");
let users: Users, lists: Lists, events: Events, audit: Audit, content: Content;

const snap = (id: number) => ({ id, title: `Film ${id}`, year: 2000, posterPath: null, backdropPath: null, voteAverage: null, genreIds: [18], originalLanguage: "en" });

beforeAll(async () => {
  seedV1Database();
  users = await import("@/lib/db/users");
  lists = await import("@/lib/db/lists");
  events = await import("@/lib/db/events");
  audit = await import("@/lib/db/audit");
  content = await import("@/lib/db/content");
});

afterAll(() => {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows may still hold the file open; temp dir cleanup is best-effort. */
  }
});

describe("v1 → v2 migration", () => {
  it("preserves existing users, lists and legacy tables and adds new columns with safe defaults", () => {
    const legacy = users.findUserByEmail("legacy@example.test")!;
    expect(legacy).toMatchObject({ name: "Legacy", role: "admin", status: "active", lastSeenAt: null, preferredGenres: [18], locale: "ru" });
    expect(lists.getList(legacy.id, "watchlist").map((i) => i.snapshot.title)).toEqual(["The Shawshank Redemption"]);
    const raw = new DatabaseSync(dbFile, { readOnly: true });
    expect((raw.prepare("SELECT COUNT(*) AS n FROM collections").get() as { n: number }).n).toBe(1);
    expect((raw.prepare("PRAGMA user_version").get() as { user_version: number }).user_version).toBe(2);
    raw.close();
  });

  it("carries the v1 spotlight over as an active banner", () => {
    const [banner] = content.listBanners(true);
    expect(banner).toMatchObject({ movieId: 1398, isActive: true, description: { en: "Editorial line" } });
  });
});

describe("users", () => {
  it("always creates regular active users with lowercase unique emails", () => {
    const u = users.createUser({ email: "Test@Example.com", name: "Test", passwordHash: "x", locale: "kk" });
    expect(u).toMatchObject({ email: "test@example.com", role: "user", status: "active" });
    expect(() => users.createUser({ email: "test@example.com", name: "Dup", passwordHash: "x", locale: "en" })).toThrow();
  });

  it("paginates, filters, searches (with escaped wildcards) and sorts", () => {
    for (let i = 0; i < 25; i++) users.createUser({ email: `bulk${i}@example.test`, name: `Bulk ${String(i).padStart(2, "0")}`, passwordHash: "x", locale: "en" });
    const p1 = users.listUsersPaged({ perPage: 10, sort: "name" });
    expect(p1.items).toHaveLength(10);
    expect(p1.total).toBe(27);
    expect(p1.totalPages).toBe(3);
    expect(users.listUsersPaged({ query: "bulk1", perPage: 50 }).total).toBe(11); // bulk1, bulk10..19
    expect(users.listUsersPaged({ query: "%" }).total).toBe(0); // literal %, not a wildcard
    expect(users.listUsersPaged({ role: "admin" }).items.map((u) => u.email)).toEqual(["legacy@example.test"]);
    expect(users.listUsersPaged({ page: 999, perPage: 10 }).page).toBe(3); // clamped
  });

  it("tracks status, role, last activity and active-admin count", () => {
    const u = users.findUserByEmail("test@example.com")!;
    users.setUserStatus(u.id, "suspended");
    expect(users.findUserById(u.id)?.status).toBe("suspended");
    expect(users.listUsersPaged({ status: "suspended" }).total).toBe(1);
    users.setUserStatus(u.id, "active");
    expect(users.countActiveAdmins()).toBe(1);
    users.setUserRole(u.id, "admin");
    expect(users.countActiveAdmins()).toBe(2);
    users.touchLastSeen(u.id, null, 1_000_000);
    users.touchLastSeen(u.id, 1_000_000, 1_000_000 + 60_000); // throttled (< 5 min)
    expect(users.findUserById(u.id)?.lastSeenAt).toBe(1_000_000);
    expect(users.getUserStats().total).toBe(27);
  });
});

describe("lists are per-user", () => {
  it("never mixes two users' lists", () => {
    const a = users.findUserByEmail("bulk1@example.test")!;
    const b = users.findUserByEmail("bulk2@example.test")!;
    lists.addToList(a.id, "watchlist", snap(10));
    lists.addToList(a.id, "watchlist", snap(10));
    lists.addToList(b.id, "favorite", snap(20));
    expect(lists.getAllMemberIds(a.id)).toEqual({ watchlist: [10], favorite: [] });
    expect(lists.getAllMemberIds(b.id)).toEqual({ watchlist: [], favorite: [20] });
    lists.removeFromList(a.id, "watchlist", 10);
    expect(lists.isInList(a.id, "watchlist", 10)).toBe(false);
  });
});

describe("analytics events", () => {
  it("records events and aggregates them by range", () => {
    const now = Date.now();
    const v1 = events.visitorHash("1.2.3.4", "UA", now);
    expect(events.visitorHash("1.2.3.4", "UA", now)).toBe(v1); // stable within a day
    expect(v1).toMatch(/^[a-f0-9]{32}$/);
    events.recordEvent({ type: "page_view", visitorHash: v1, path: "/" });
    events.recordEvent({ type: "page_view", visitorHash: v1, path: "/top" });
    events.recordEvent({ type: "page_view", visitorHash: events.visitorHash("5.6.7.8", "UA", now), path: "/" });
    events.recordEvent({ type: "movie_view", movieId: 27205, props: { title: "Inception", genres: [28, 878], hasTrailer: true, hasProvider: false } });
    events.recordEvent({ type: "movie_view", movieId: 27205, props: { title: "Inception", genres: [28, 878], hasTrailer: true, hasProvider: false } });
    events.recordEvent({ type: "movie_search", props: { query: "dune", results: 0, mode: "search" } });
    events.recordEvent({ type: "page_view", path: "/old", at: now - 40 * 86_400_000 });
    const r = { from: now - 86_400_000, to: now + 1000 };
    expect(events.countEvents("page_view", r)).toBe(3);
    expect(events.uniqueVisitors(r)).toBe(2);
    expect(events.topMovies("movie_view", r)).toEqual([{ movieId: 27205, title: "Inception", count: 2 }]);
    expect(events.genreCounts(r).map((g) => g.genreId).sort()).toEqual([28, 878]);
    expect(events.topSearches(r)).toEqual([{ query: "dune", count: 1, zeroResults: 1 }]);
    expect(events.playbackAvailability(r)).toEqual({ withTrailer: 2, withoutTrailer: 0, withProvider: 0, withoutProvider: 2 });
    expect(events.deleteEventsBefore(now - 30 * 86_400_000)).toBe(1);
  });
});

describe("audit log and content", () => {
  it("appends audit entries newest first", () => {
    audit.logAudit({ actorId: null, action: "test.one" });
    audit.logAudit({ actorId: null, action: "test.two", targetType: "user", targetId: "abc" });
    const res = audit.listAudit();
    expect(res.items[0].action).toBe("test.two");
    expect(audit.listAudit({ targetId: "abc" }).total).toBe(1);
  });

  it("manages hidden movies and provider links", () => {
    content.hideMovie(550, "test");
    expect(content.hiddenMovieIds().has(550)).toBe(true);
    content.unhideMovie(550);
    expect(content.hiddenMovieIds().has(550)).toBe(false);
    content.upsertProviderLink({ movieId: 27205, provider: "Example", url: "https://example.com/a", region: "KZ" });
    content.upsertProviderLink({ movieId: 27205, provider: "Example", url: "https://example.com/b", region: null });
    const links = content.listProviderLinks(27205);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("https://example.com/b");
    expect(content.deleteProviderLink(links[0].id)?.provider).toBe("Example");
  });
});
