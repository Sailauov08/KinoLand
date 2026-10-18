import "server-only";
import type { Locale } from "@/lib/i18n/config";
import { getDb } from "./index";

/** KinoLand-owned editorial text. TMDB metadata itself is never stored or overridden here. */
export interface LocalizedText {
  en?: string;
  ru?: string;
  kk?: string;
}

export const localized = (t: LocalizedText, locale: Locale) => t[locale] || t.en || t.ru || t.kk || "";

const parseText = (json: string | null): LocalizedText => {
  try {
    const v = JSON.parse(json ?? "{}") as LocalizedText;
    return { en: v.en || undefined, ru: v.ru || undefined, kk: v.kk || undefined };
  } catch {
    return {};
  }
};

/* ── Homepage banners (hero featured selections) ─────────────────────────── */

export interface Banner {
  id: number;
  movieId: number;
  headline: LocalizedText;
  description: LocalizedText;
  isActive: boolean;
  position: number;
  updatedAt: number;
}

interface BannerRow {
  id: number;
  movie_id: number;
  headline: string;
  description: string;
  is_active: number;
  position: number;
  updated_at: number;
}

const toBanner = (r: BannerRow): Banner => ({
  id: r.id,
  movieId: r.movie_id,
  headline: parseText(r.headline),
  description: parseText(r.description),
  isActive: !!r.is_active,
  position: r.position,
  updatedAt: r.updated_at,
});

export function listBanners(activeOnly = false): Banner[] {
  const rows = getDb()
    .prepare(`SELECT * FROM banners ${activeOnly ? "WHERE is_active = 1" : ""} ORDER BY position ASC, id ASC`)
    .all() as unknown as BannerRow[];
  return rows.map(toBanner);
}

/** Active banners rotate once per day so returning visitors see variety. */
export function bannerOfTheDay(now = Date.now()): Banner | null {
  const banners = listBanners(true);
  return banners.length ? banners[Math.floor(now / 86_400_000) % banners.length] : null;
}

export function getBanner(id: number): Banner | null {
  const row = getDb().prepare("SELECT * FROM banners WHERE id = ?").get(id) as BannerRow | undefined;
  return row ? toBanner(row) : null;
}

export function saveBanner(input: { id?: number; movieId: number; headline: LocalizedText; description: LocalizedText; isActive: boolean; position: number }): number {
  const now = Date.now();
  const db = getDb();
  if (input.id) {
    db.prepare("UPDATE banners SET movie_id = ?, headline = ?, description = ?, is_active = ?, position = ?, updated_at = ? WHERE id = ?").run(
      input.movieId,
      JSON.stringify(input.headline),
      JSON.stringify(input.description),
      input.isActive ? 1 : 0,
      input.position,
      now,
      input.id,
    );
    return input.id;
  }
  const res = db
    .prepare("INSERT INTO banners (movie_id, headline, description, is_active, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(input.movieId, JSON.stringify(input.headline), JSON.stringify(input.description), input.isActive ? 1 : 0, input.position, now, now);
  return Number(res.lastInsertRowid);
}

export function deleteBanner(id: number) {
  getDb().prepare("DELETE FROM banners WHERE id = ?").run(id);
}

/* ── Movie visibility overrides ───────────────────────────────────────────── */

export function listHiddenMovies(): { movieId: number; reason: string | null; createdAt: number }[] {
  return (getDb().prepare("SELECT * FROM hidden_movies ORDER BY created_at DESC").all() as unknown as { movie_id: number; reason: string | null; created_at: number }[]).map(
    (r) => ({ movieId: r.movie_id, reason: r.reason, createdAt: r.created_at }),
  );
}

let hiddenCache: { ids: Set<number>; at: number } | null = null;

/** Hidden ids, cached briefly in memory because every movie list is filtered through it. */
export function hiddenMovieIds(): Set<number> {
  if (hiddenCache && Date.now() - hiddenCache.at < 30_000) return hiddenCache.ids;
  const ids = new Set((getDb().prepare("SELECT movie_id FROM hidden_movies").all() as unknown as { movie_id: number }[]).map((r) => r.movie_id));
  hiddenCache = { ids, at: Date.now() };
  return ids;
}

export function hideMovie(movieId: number, reason: string | null) {
  getDb().prepare("INSERT INTO hidden_movies (movie_id, reason, created_at) VALUES (?, ?, ?) ON CONFLICT(movie_id) DO UPDATE SET reason = excluded.reason").run(movieId, reason, Date.now());
  hiddenCache = null;
}

export function unhideMovie(movieId: number) {
  getDb().prepare("DELETE FROM hidden_movies WHERE movie_id = ?").run(movieId);
  hiddenCache = null;
}

/* ── Approved "where to watch" provider links ─────────────────────────────── */

export interface ProviderLink {
  id: number;
  movieId: number;
  provider: string;
  url: string;
  region: string | null;
  createdAt: number;
}

const toLink = (r: { id: number; movie_id: number; provider: string; url: string; region: string | null; created_at: number }): ProviderLink => ({
  id: r.id,
  movieId: r.movie_id,
  provider: r.provider,
  url: r.url,
  region: r.region,
  createdAt: r.created_at,
});

export function listProviderLinks(movieId?: number): ProviderLink[] {
  const rows = (movieId
    ? getDb().prepare("SELECT * FROM provider_links WHERE movie_id = ? ORDER BY provider").all(movieId)
    : getDb().prepare("SELECT * FROM provider_links ORDER BY created_at DESC").all()) as unknown as Parameters<typeof toLink>[0][];
  return rows.map(toLink);
}

export function upsertProviderLink(input: { movieId: number; provider: string; url: string; region: string | null }) {
  getDb()
    .prepare(
      `INSERT INTO provider_links (movie_id, provider, url, region, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(movie_id, provider) DO UPDATE SET url = excluded.url, region = excluded.region`,
    )
    .run(input.movieId, input.provider, input.url, input.region, Date.now());
}

export function deleteProviderLink(id: number): ProviderLink | null {
  const row = getDb().prepare("SELECT * FROM provider_links WHERE id = ?").get(id) as Parameters<typeof toLink>[0] | undefined;
  getDb().prepare("DELETE FROM provider_links WHERE id = ?").run(id);
  return row ? toLink(row) : null;
}
