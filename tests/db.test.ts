import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Each run uses a throwaway database file; env is read at import time, so set it first.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kino-test-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");

type Users = typeof import("@/lib/db/users");
type Lists = typeof import("@/lib/db/lists");
type Collections = typeof import("@/lib/db/collections");
let users: Users, lists: Lists, collections: Collections;

const snap = (id: number) => ({ id, title: `Film ${id}`, year: 2000, posterPath: null, backdropPath: null, voteAverage: null, genreIds: [18], originalLanguage: "en" });

beforeAll(async () => {
  users = await import("@/lib/db/users");
  lists = await import("@/lib/db/lists");
  collections = await import("@/lib/db/collections");
});

afterAll(() => {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows may still hold the file open; temp dir cleanup is best-effort. */
  }
});

describe("database repositories", () => {
  it("creates users with lowercase unique emails", () => {
    const u = users.createUser({ email: "Test@Example.com", name: "Test", passwordHash: "x", role: "user", locale: "kk" });
    expect(u.email).toBe("test@example.com");
    expect(users.findUserByEmail("TEST@example.com")?.id).toBe(u.id);
    expect(() => users.createUser({ email: "test@example.com", name: "Dup", passwordHash: "x", role: "user", locale: "en" })).toThrow();
  });

  it("adds, de-duplicates and removes list items per user", () => {
    const u = users.findUserByEmail("test@example.com")!;
    lists.addToList(u.id, "watchlist", snap(1));
    lists.addToList(u.id, "watchlist", snap(1));
    lists.addToList(u.id, "favorite", snap(2));
    expect(lists.getList(u.id, "watchlist").map((i) => i.movieId)).toEqual([1]);
    expect(lists.getAllMemberIds(u.id)).toEqual({ watchlist: [1], favorite: [2] });
    expect(lists.getMembership(u.id, [1, 2, 3]).get(1)?.has("watchlist")).toBe(true);
    lists.removeFromList(u.id, "watchlist", 1);
    expect(lists.isInList(u.id, "watchlist", 1)).toBe(false);
  });

  it("stores profile preferences and ignores unknown genres", () => {
    const u = users.findUserByEmail("test@example.com")!;
    users.updateUserProfile(u.id, { name: "Renamed", preferredGenres: [878, 18], locale: "ru" });
    expect(users.findUserById(u.id)).toMatchObject({ name: "Renamed", preferredGenres: [878, 18], locale: "ru" });
  });

  it("manages collections and item ordering", () => {
    const id = collections.createCollection({
      slug: "test-picks",
      title: { en: "Test picks", ru: "Тест" },
      description: { en: "" },
      isPublished: false,
      isFeatured: true,
      position: 0,
    });
    [10, 20, 30].forEach((m) => collections.addCollectionItem(id, snap(m)));
    collections.moveCollectionItem(id, 30, "up");
    collections.moveCollectionItem(id, 10, "up"); // already first: no-op
    expect(collections.getCollectionItems(id).map((i) => i.movieId)).toEqual([10, 30, 20]);
    expect(collections.listCollections({ publishedOnly: true })).toHaveLength(0);
    expect(collections.getCollectionBySlug("test-picks")?.itemCount).toBe(3);
    expect(collections.localized(collections.getCollectionById(id)!.title, "kk")).toBe("Test picks");
    expect(collections.slugExists("test-picks")).toBe(true);
    expect(collections.slugExists("test-picks", id)).toBe(false);
    collections.deleteCollection(id);
    expect(collections.getCollectionItems(id)).toHaveLength(0);
  });
});
