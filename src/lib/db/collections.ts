import "server-only";
import type { Locale } from "@/lib/i18n/config";
import type { MovieSnapshot } from "@/lib/movies/types";
import { getDb } from "./index";

export interface LocalizedText {
  en: string;
  ru?: string;
  kk?: string;
}

export interface Collection {
  id: number;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  isPublished: boolean;
  isFeatured: boolean;
  position: number;
  updatedAt: number;
  itemCount: number;
}

export interface CollectionItem {
  movieId: number;
  position: number;
  snapshot: MovieSnapshot;
}

interface Row {
  id: number;
  slug: string;
  title: string;
  description: string;
  is_published: number;
  is_featured: number;
  position: number;
  updated_at: number;
  item_count: number;
}

const parseText = (json: string): LocalizedText => {
  try {
    const v = JSON.parse(json) as Partial<LocalizedText>;
    return { en: v.en ?? "", ru: v.ru || undefined, kk: v.kk || undefined };
  } catch {
    return { en: "" };
  }
};

export const localized = (t: LocalizedText, locale: Locale) => t[locale] || t.en;

const toCollection = (r: Row): Collection => ({
  id: r.id,
  slug: r.slug,
  title: parseText(r.title),
  description: parseText(r.description),
  isPublished: !!r.is_published,
  isFeatured: !!r.is_featured,
  position: r.position,
  updatedAt: r.updated_at,
  itemCount: r.item_count,
});

const SELECT = `SELECT c.*, (SELECT COUNT(*) FROM collection_items ci WHERE ci.collection_id = c.id) AS item_count FROM collections c`;

export function listCollections(opts: { publishedOnly?: boolean; featuredOnly?: boolean } = {}): Collection[] {
  const where: string[] = [];
  if (opts.publishedOnly) where.push("c.is_published = 1");
  if (opts.featuredOnly) where.push("c.is_featured = 1");
  const sql = `${SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY c.position ASC, c.updated_at DESC`;
  return (getDb().prepare(sql).all() as unknown as Row[]).map(toCollection);
}

export function getCollectionById(id: number): Collection | null {
  const row = getDb().prepare(`${SELECT} WHERE c.id = ?`).get(id) as Row | undefined;
  return row ? toCollection(row) : null;
}

export function getCollectionBySlug(slug: string): Collection | null {
  const row = getDb().prepare(`${SELECT} WHERE c.slug = ?`).get(slug) as Row | undefined;
  return row ? toCollection(row) : null;
}

export function getCollectionItems(collectionId: number): CollectionItem[] {
  const rows = getDb()
    .prepare("SELECT movie_id, position, snapshot FROM collection_items WHERE collection_id = ? ORDER BY position ASC")
    .all(collectionId) as { movie_id: number; position: number; snapshot: string }[];
  return rows.map((r) => ({ movieId: r.movie_id, position: r.position, snapshot: JSON.parse(r.snapshot) as MovieSnapshot }));
}

export interface CollectionInput {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  isPublished: boolean;
  isFeatured: boolean;
  position: number;
}

export function slugExists(slug: string, exceptId?: number): boolean {
  const row = getDb().prepare("SELECT id FROM collections WHERE slug = ?").get(slug) as { id: number } | undefined;
  return !!row && row.id !== exceptId;
}

export function createCollection(input: CollectionInput): number {
  const now = Date.now();
  const res = getDb()
    .prepare(
      `INSERT INTO collections (slug, title, description, is_published, is_featured, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.slug,
      JSON.stringify(input.title),
      JSON.stringify(input.description),
      input.isPublished ? 1 : 0,
      input.isFeatured ? 1 : 0,
      input.position,
      now,
      now,
    );
  return Number(res.lastInsertRowid);
}

export function updateCollection(id: number, input: CollectionInput) {
  getDb()
    .prepare(
      `UPDATE collections SET slug = ?, title = ?, description = ?, is_published = ?, is_featured = ?, position = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.slug,
      JSON.stringify(input.title),
      JSON.stringify(input.description),
      input.isPublished ? 1 : 0,
      input.isFeatured ? 1 : 0,
      input.position,
      Date.now(),
      id,
    );
}

export function deleteCollection(id: number) {
  getDb().prepare("DELETE FROM collections WHERE id = ?").run(id);
}

const touch = (id: number) => getDb().prepare("UPDATE collections SET updated_at = ? WHERE id = ?").run(Date.now(), id);

export function addCollectionItem(collectionId: number, snapshot: MovieSnapshot) {
  const db = getDb();
  const max = db.prepare("SELECT COALESCE(MAX(position), -1) AS m FROM collection_items WHERE collection_id = ?").get(collectionId) as {
    m: number;
  };
  db.prepare(
    `INSERT INTO collection_items (collection_id, movie_id, position, snapshot) VALUES (?, ?, ?, ?)
     ON CONFLICT(collection_id, movie_id) DO UPDATE SET snapshot = excluded.snapshot`,
  ).run(collectionId, snapshot.id, max.m + 1, JSON.stringify(snapshot));
  touch(collectionId);
}

export function removeCollectionItem(collectionId: number, movieId: number) {
  getDb().prepare("DELETE FROM collection_items WHERE collection_id = ? AND movie_id = ?").run(collectionId, movieId);
  touch(collectionId);
}

/** Swaps an item with its neighbour; positions are re-normalised to 0..n-1. */
export function moveCollectionItem(collectionId: number, movieId: number, direction: "up" | "down") {
  const db = getDb();
  const ids = getCollectionItems(collectionId).map((i) => i.movieId);
  const idx = ids.indexOf(movieId);
  const target = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || target < 0 || target >= ids.length) return;
  [ids[idx], ids[target]] = [ids[target], ids[idx]];
  const stmt = db.prepare("UPDATE collection_items SET position = ? WHERE collection_id = ? AND movie_id = ?");
  db.exec("BEGIN");
  try {
    ids.forEach((id, pos) => stmt.run(pos, collectionId, id));
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  touch(collectionId);
}
