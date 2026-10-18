import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { count, one, q } from "./index";
import { DAY_SQL } from "./users";

export const EVENT_TYPES = [
  "page_view",
  "movie_view",
  "movie_search",
  "watchlist_add",
  "watchlist_remove",
  "favorite_add",
  "favorite_remove",
  "signup_success",
  "login_success",
  "playback_started",
  "playback_error",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

const utcDay = (ts: number) => new Date(ts).toISOString().slice(0, 10);

let saltCache: { day: string; salt: string } | null = null;

/**
 * Cookieless unique-visitor counting: the hash input includes a random salt that rotates every
 * UTC day and is deleted afterwards, so visitors cannot be re-identified or tracked across days.
 */
async function dailySalt(now = Date.now()): Promise<string> {
  const day = utcDay(now);
  if (saltCache?.day === day) return saltCache.salt;
  await q("INSERT INTO kinoland.daily_salts (day, salt) VALUES ($1, $2) ON CONFLICT (day) DO NOTHING", [day, randomBytes(32).toString("hex")]);
  await q("DELETE FROM kinoland.daily_salts WHERE day < $1", [utcDay(now - 86_400_000)]);
  const row = await one<{ salt: string }>("SELECT salt FROM kinoland.daily_salts WHERE day = $1", [day]);
  saltCache = { day, salt: row!.salt };
  return row!.salt;
}

export async function visitorHash(ip: string, userAgent: string, now = Date.now()): Promise<string> {
  return createHash("sha256").update(`${await dailySalt(now)}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

export interface EventInput {
  type: EventType;
  visitorHash?: string | null;
  userId?: string | null;
  path?: string | null;
  movieId?: number | null;
  props?: Record<string, unknown> | null;
  at?: number;
}

export async function recordEvent(e: EventInput) {
  await q("INSERT INTO kinoland.events (type, created_at, visitor_hash, user_id, path, movie_id, props) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)", [
    e.type,
    e.at ?? Date.now(),
    e.visitorHash ?? null,
    e.userId ?? null,
    e.path ?? null,
    e.movieId ?? null,
    e.props ? JSON.stringify(e.props) : null,
  ]);
}

export interface Range {
  from: number;
  to: number;
}

const TZ = () => env.appTimezone;

export const countEvents = (type: EventType, r: Range) =>
  count("SELECT COUNT(*)::int AS n FROM kinoland.events WHERE type = $1 AND created_at BETWEEN $2 AND $3", [type, r.from, r.to]);

export async function countsByType(r: Range): Promise<Record<string, number>> {
  const rows = await q<{ type: string; n: number }>(
    "SELECT type, COUNT(*)::int AS n FROM kinoland.events WHERE created_at BETWEEN $1 AND $2 GROUP BY type",
    [r.from, r.to],
  );
  return Object.fromEntries(rows.map((x) => [x.type, Number(x.n)]));
}

export const uniqueVisitors = (r: Range) =>
  count(
    "SELECT COUNT(DISTINCT visitor_hash)::int AS n FROM kinoland.events WHERE type = 'page_view' AND visitor_hash IS NOT NULL AND created_at BETWEEN $1 AND $2",
    [r.from, r.to],
  );

/** Visitor-days: unique visitors are counted per day because the hash rotates daily. */
export function visitsByDay(r: Range): Promise<{ day: string; views: number; visitors: number }[]> {
  return q(
    `SELECT ${DAY_SQL("created_at", "$3")} AS day, COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS visitors
     FROM kinoland.events WHERE type = 'page_view' AND created_at BETWEEN $1 AND $2 GROUP BY day ORDER BY day`,
    [r.from, r.to, TZ()],
  );
}

export function seriesByDay(types: EventType[], r: Range): Promise<{ day: string; type: string; count: number }[]> {
  return q(
    `SELECT ${DAY_SQL("created_at", "$4")} AS day, type, COUNT(*)::int AS count
     FROM kinoland.events WHERE type = ANY($1::text[]) AND created_at BETWEEN $2 AND $3 GROUP BY day, type ORDER BY day`,
    [types, r.from, r.to, TZ()],
  );
}

export interface TopMovie {
  movieId: number;
  title: string;
  count: number;
}

/** Most frequent movies for an event type; titles come from the event props recorded at the time. */
export async function topMovies(type: EventType, r: Range, limit = 10): Promise<TopMovie[]> {
  const rows = await q<{ movie_id: number; count: number; title: string | null }>(
    `SELECT e.movie_id, COUNT(*)::int AS count,
            (SELECT e2.props->>'title' FROM kinoland.events e2
              WHERE e2.movie_id = e.movie_id AND e2.props ? 'title' ORDER BY e2.id DESC LIMIT 1) AS title
     FROM kinoland.events e WHERE e.type = $1 AND e.movie_id IS NOT NULL AND e.created_at BETWEEN $2 AND $3
     GROUP BY e.movie_id ORDER BY count DESC, e.movie_id LIMIT $4`,
    [type, r.from, r.to, limit],
  );
  return rows.map((x) => ({ movieId: x.movie_id, count: Number(x.count), title: x.title ?? `#${x.movie_id}` }));
}

export async function genreCounts(r: Range): Promise<{ genreId: number; count: number }[]> {
  const rows = await q<{ genre_id: number; count: number }>(
    `SELECT g.value::int AS genre_id, COUNT(*)::int AS count
     FROM kinoland.events e, jsonb_array_elements_text(COALESCE(e.props->'genres', '[]'::jsonb)) AS g(value)
     WHERE e.type = 'movie_view' AND jsonb_typeof(e.props->'genres') = 'array' AND e.created_at BETWEEN $1 AND $2
     GROUP BY genre_id ORDER BY count DESC`,
    [r.from, r.to],
  );
  return rows.map((x) => ({ genreId: Number(x.genre_id), count: Number(x.count) }));
}

export async function topSearches(r: Range, limit = 20): Promise<{ query: string; count: number; zeroResults: number }[]> {
  const rows = await q<{ query: string; count: number; zero_results: number }>(
    `SELECT props->>'query' AS query, COUNT(*)::int AS count,
            COUNT(*) FILTER (WHERE (props->>'results')::int = 0)::int AS zero_results
     FROM kinoland.events WHERE type = 'movie_search' AND props->>'query' IS NOT NULL AND created_at BETWEEN $1 AND $2
     GROUP BY query ORDER BY count DESC, query LIMIT $3`,
    [r.from, r.to, limit],
  );
  return rows.map((x) => ({ query: x.query, count: Number(x.count), zeroResults: Number(x.zero_results) }));
}

export async function searchSummary(r: Range): Promise<{ total: number; withQuery: number; zeroResults: number; filterOnly: number }> {
  const row = await one<Record<string, number>>(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE props->>'query' IS NOT NULL)::int AS with_query,
            COUNT(*) FILTER (WHERE (props->>'results')::int = 0)::int AS zero_results,
            COUNT(*) FILTER (WHERE props->>'mode' = 'discover')::int AS filter_only
     FROM kinoland.events WHERE type = 'movie_search' AND created_at BETWEEN $1 AND $2`,
    [r.from, r.to],
  );
  return { total: Number(row?.total ?? 0), withQuery: Number(row?.with_query ?? 0), zeroResults: Number(row?.zero_results ?? 0), filterOnly: Number(row?.filter_only ?? 0) };
}

/** Movie page views split by whether a trailer / approved provider link was available. */
export async function playbackAvailability(r: Range) {
  const row = await one<Record<string, number>>(
    `SELECT COUNT(*) FILTER (WHERE props->>'hasTrailer' = 'true')::int AS with_trailer,
            COUNT(*) FILTER (WHERE props->>'hasTrailer' = 'false')::int AS without_trailer,
            COUNT(*) FILTER (WHERE props->>'hasProvider' = 'true')::int AS with_provider,
            COUNT(*) FILTER (WHERE props->>'hasProvider' = 'false')::int AS without_provider
     FROM kinoland.events WHERE type = 'movie_view' AND created_at BETWEEN $1 AND $2`,
    [r.from, r.to],
  );
  return {
    withTrailer: Number(row?.with_trailer ?? 0),
    withoutTrailer: Number(row?.without_trailer ?? 0),
    withProvider: Number(row?.with_provider ?? 0),
    withoutProvider: Number(row?.without_provider ?? 0),
  };
}

export async function topPaths(r: Range, limit = 10): Promise<{ path: string; count: number }[]> {
  const rows = await q<{ path: string; count: number }>(
    `SELECT path, COUNT(*)::int AS count FROM kinoland.events WHERE type = 'page_view' AND path IS NOT NULL AND created_at BETWEEN $1 AND $2
     GROUP BY path ORDER BY count DESC, path LIMIT $3`,
    [r.from, r.to, limit],
  );
  return rows.map((x) => ({ path: x.path, count: Number(x.count) }));
}

export async function eventStorageInfo(): Promise<{ total: number; oldest: number | null }> {
  const row = await one<{ total: number; oldest: number | null }>("SELECT COUNT(*)::int AS total, MIN(created_at) AS oldest FROM kinoland.events");
  return { total: Number(row?.total ?? 0), oldest: row?.oldest == null ? null : Number(row.oldest) };
}

export async function deleteEventsBefore(ts: number): Promise<number> {
  return (await q<{ id: number }>("DELETE FROM kinoland.events WHERE created_at < $1 RETURNING id", [ts])).length;
}
