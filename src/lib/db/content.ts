import "server-only";
import type { Locale } from "@/lib/i18n/config";
import { one, q } from "./index";

/** KinoLand-owned editorial text. TMDB metadata itself is never stored or overridden here. */
export interface LocalizedText {
  en?: string;
  ru?: string;
  kk?: string;
}

export const localized = (t: LocalizedText, locale: Locale) => t[locale] || t.en || t.ru || t.kk || "";

const asText = (v: unknown): LocalizedText => {
  const o = (v && typeof v === "object" ? v : {}) as LocalizedText;
  return { en: o.en || undefined, ru: o.ru || undefined, kk: o.kk || undefined };
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
  headline: unknown;
  description: unknown;
  is_active: boolean;
  position: number;
  updated_at: number;
}

const toBanner = (r: BannerRow): Banner => ({
  id: Number(r.id),
  movieId: r.movie_id,
  headline: asText(r.headline),
  description: asText(r.description),
  isActive: Boolean(r.is_active),
  position: r.position,
  updatedAt: Number(r.updated_at),
});

export async function listBanners(activeOnly = false): Promise<Banner[]> {
  const rows = await q<BannerRow>(`SELECT * FROM kinoland.banners ${activeOnly ? "WHERE is_active" : ""} ORDER BY position ASC, id ASC`);
  return rows.map(toBanner);
}

/** Active banners rotate once per day so returning visitors see variety. */
export async function bannerOfTheDay(now = Date.now()): Promise<Banner | null> {
  const banners = await listBanners(true);
  return banners.length ? banners[Math.floor(now / 86_400_000) % banners.length] : null;
}

export async function getBanner(id: number): Promise<Banner | null> {
  const row = await one<BannerRow>("SELECT * FROM kinoland.banners WHERE id = $1", [id]);
  return row ? toBanner(row) : null;
}

export async function saveBanner(input: { id?: number; movieId: number; headline: LocalizedText; description: LocalizedText; isActive: boolean; position: number }): Promise<number> {
  const now = Date.now();
  if (input.id) {
    await q(
      "UPDATE kinoland.banners SET movie_id = $1, headline = $2::jsonb, description = $3::jsonb, is_active = $4, position = $5, updated_at = $6 WHERE id = $7",
      [input.movieId, JSON.stringify(input.headline), JSON.stringify(input.description), input.isActive, input.position, now, input.id],
    );
    return input.id;
  }
  const row = await one<{ id: number }>(
    `INSERT INTO kinoland.banners (movie_id, headline, description, is_active, position, created_at, updated_at)
     VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, $6, $6) RETURNING id`,
    [input.movieId, JSON.stringify(input.headline), JSON.stringify(input.description), input.isActive, input.position, now],
  );
  return Number(row!.id);
}

export async function deleteBanner(id: number) {
  await q("DELETE FROM kinoland.banners WHERE id = $1", [id]);
}

/* ── Movie visibility overrides ───────────────────────────────────────────── */

export async function listHiddenMovies(): Promise<{ movieId: number; reason: string | null; createdAt: number }[]> {
  const rows = await q<{ movie_id: number; reason: string | null; created_at: number }>("SELECT * FROM kinoland.hidden_movies ORDER BY created_at DESC");
  return rows.map((r) => ({ movieId: r.movie_id, reason: r.reason, createdAt: Number(r.created_at) }));
}

let hiddenCache: { ids: Set<number>; at: number } | null = null;

/** Hidden ids, cached briefly per server instance because every movie list is filtered through it. */
export async function hiddenMovieIds(): Promise<Set<number>> {
  if (hiddenCache && Date.now() - hiddenCache.at < 30_000) return hiddenCache.ids;
  const ids = new Set((await q<{ movie_id: number }>("SELECT movie_id FROM kinoland.hidden_movies")).map((r) => r.movie_id));
  hiddenCache = { ids, at: Date.now() };
  return ids;
}

export async function hideMovie(movieId: number, reason: string | null) {
  await q(
    "INSERT INTO kinoland.hidden_movies (movie_id, reason, created_at) VALUES ($1, $2, $3) ON CONFLICT (movie_id) DO UPDATE SET reason = EXCLUDED.reason",
    [movieId, reason, Date.now()],
  );
  hiddenCache = null;
}

export async function unhideMovie(movieId: number) {
  await q("DELETE FROM kinoland.hidden_movies WHERE movie_id = $1", [movieId]);
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

type LinkRow = { id: number; movie_id: number; provider: string; url: string; region: string | null; created_at: number };
const toLink = (r: LinkRow): ProviderLink => ({ id: Number(r.id), movieId: r.movie_id, provider: r.provider, url: r.url, region: r.region, createdAt: Number(r.created_at) });

export async function listProviderLinks(movieId?: number): Promise<ProviderLink[]> {
  const rows = movieId
    ? await q<LinkRow>("SELECT * FROM kinoland.provider_links WHERE movie_id = $1 ORDER BY provider", [movieId])
    : await q<LinkRow>("SELECT * FROM kinoland.provider_links ORDER BY created_at DESC");
  return rows.map(toLink);
}

export async function upsertProviderLink(input: { movieId: number; provider: string; url: string; region: string | null }) {
  await q(
    `INSERT INTO kinoland.provider_links (movie_id, provider, url, region, created_at) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (movie_id, provider) DO UPDATE SET url = EXCLUDED.url, region = EXCLUDED.region`,
    [input.movieId, input.provider, input.url, input.region, Date.now()],
  );
}

export async function deleteProviderLink(id: number): Promise<ProviderLink | null> {
  const row = await one<LinkRow>("DELETE FROM kinoland.provider_links WHERE id = $1 RETURNING *", [id]);
  return row ? toLink(row) : null;
}
