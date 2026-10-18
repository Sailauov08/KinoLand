import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./index";

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

const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

/**
 * Cookieless unique-visitor counting: the hash input includes a random salt that rotates every
 * UTC day and is deleted afterwards, so visitors cannot be re-identified or tracked across days.
 */
function dailySalt(now = Date.now()): string {
  const db = getDb();
  const day = dayKey(now);
  const row = db.prepare("SELECT salt FROM daily_salts WHERE day = ?").get(day) as { salt: string } | undefined;
  if (row) return row.salt;
  const salt = randomBytes(32).toString("hex");
  db.prepare("INSERT OR IGNORE INTO daily_salts (day, salt) VALUES (?, ?)").run(day, salt);
  db.prepare("DELETE FROM daily_salts WHERE day < ?").run(dayKey(now - 86_400_000));
  return (db.prepare("SELECT salt FROM daily_salts WHERE day = ?").get(day) as { salt: string }).salt;
}

export function visitorHash(ip: string, userAgent: string, now = Date.now()): string {
  return createHash("sha256").update(`${dailySalt(now)}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
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

export function recordEvent(e: EventInput) {
  getDb()
    .prepare("INSERT INTO events (type, created_at, visitor_hash, user_id, path, movie_id, props) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(e.type, e.at ?? Date.now(), e.visitorHash ?? null, e.userId ?? null, e.path ?? null, e.movieId ?? null, e.props ? JSON.stringify(e.props) : null);
}

export interface Range {
  from: number;
  to: number;
}

export function countEvents(type: EventType, r: Range): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM events WHERE type = ? AND created_at BETWEEN ? AND ?").get(type, r.from, r.to) as { n: number }).n;
}

export function countsByType(r: Range): Record<string, number> {
  const rows = getDb()
    .prepare("SELECT type, COUNT(*) AS n FROM events WHERE created_at BETWEEN ? AND ? GROUP BY type")
    .all(r.from, r.to) as unknown as { type: string; n: number }[];
  return Object.fromEntries(rows.map((x) => [x.type, x.n]));
}

export function uniqueVisitors(r: Range): number {
  return (
    getDb()
      .prepare("SELECT COUNT(DISTINCT visitor_hash) AS n FROM events WHERE type = 'page_view' AND visitor_hash IS NOT NULL AND created_at BETWEEN ? AND ?")
      .get(r.from, r.to) as { n: number }
  ).n;
}

/** Visitor-days: unique visitors are counted per day because the hash rotates daily. */
export function visitsByDay(r: Range): { day: string; views: number; visitors: number }[] {
  return getDb()
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch', 'localtime') AS day,
              COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors
       FROM events WHERE type = 'page_view' AND created_at BETWEEN ? AND ? GROUP BY day ORDER BY day`,
    )
    .all(r.from, r.to) as unknown as { day: string; views: number; visitors: number }[];
}

export function seriesByDay(types: EventType[], r: Range): { day: string; type: string; count: number }[] {
  const placeholders = types.map(() => "?").join(",");
  return getDb()
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch', 'localtime') AS day, type, COUNT(*) AS count
       FROM events WHERE type IN (${placeholders}) AND created_at BETWEEN ? AND ? GROUP BY day, type ORDER BY day`,
    )
    .all(...types, r.from, r.to) as unknown as { day: string; type: string; count: number }[];
}

export interface TopMovie {
  movieId: number;
  title: string;
  count: number;
}

/** Most frequent movies for an event type; titles come from the event props recorded at the time. */
export function topMovies(type: EventType, r: Range, limit = 10): TopMovie[] {
  return getDb()
    .prepare(
      `SELECT movie_id AS movieId, COUNT(*) AS count,
              (SELECT json_extract(e2.props, '$.title') FROM events e2 WHERE e2.movie_id = e.movie_id AND e2.props IS NOT NULL
                 AND json_extract(e2.props, '$.title') IS NOT NULL ORDER BY e2.id DESC LIMIT 1) AS title
       FROM events e WHERE type = ? AND movie_id IS NOT NULL AND created_at BETWEEN ? AND ?
       GROUP BY movie_id ORDER BY count DESC LIMIT ?`,
    )
    .all(type, r.from, r.to, limit)
    .map((row) => {
      const x = row as unknown as { movieId: number; count: number; title: string | null };
      return { movieId: x.movieId, count: x.count, title: x.title ?? `#${x.movieId}` };
    });
}

export function genreCounts(r: Range): { genreId: number; count: number }[] {
  return getDb()
    .prepare(
      `SELECT CAST(j.value AS INTEGER) AS genreId, COUNT(*) AS count
       FROM events e, json_each(json_extract(e.props, '$.genres')) j
       WHERE e.type = 'movie_view' AND e.props IS NOT NULL AND json_valid(e.props) AND e.created_at BETWEEN ? AND ?
       GROUP BY genreId ORDER BY count DESC`,
    )
    .all(r.from, r.to) as unknown as { genreId: number; count: number }[];
}

export function topSearches(r: Range, limit = 20): { query: string; count: number; zeroResults: number }[] {
  return getDb()
    .prepare(
      `SELECT json_extract(props, '$.query') AS query, COUNT(*) AS count,
              SUM(CASE WHEN json_extract(props, '$.results') = 0 THEN 1 ELSE 0 END) AS zeroResults
       FROM events WHERE type = 'movie_search' AND props IS NOT NULL AND json_valid(props)
         AND json_extract(props, '$.query') IS NOT NULL AND created_at BETWEEN ? AND ?
       GROUP BY query ORDER BY count DESC LIMIT ?`,
    )
    .all(r.from, r.to, limit) as unknown as { query: string; count: number; zeroResults: number }[];
}

export function searchSummary(r: Range): { total: number; withQuery: number; zeroResults: number; filterOnly: number } {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN json_extract(props, '$.query') IS NOT NULL THEN 1 ELSE 0 END) AS withQuery,
              SUM(CASE WHEN json_extract(props, '$.results') = 0 THEN 1 ELSE 0 END) AS zeroResults,
              SUM(CASE WHEN json_extract(props, '$.mode') = 'discover' THEN 1 ELSE 0 END) AS filterOnly
       FROM events WHERE type = 'movie_search' AND created_at BETWEEN ? AND ?`,
    )
    .get(r.from, r.to) as Record<string, number | null>;
  return { total: row.total ?? 0, withQuery: row.withQuery ?? 0, zeroResults: row.zeroResults ?? 0, filterOnly: row.filterOnly ?? 0 };
}

/** Movie page views split by whether a trailer / approved provider link was available. */
export function playbackAvailability(r: Range): { withTrailer: number; withoutTrailer: number; withProvider: number; withoutProvider: number } {
  const row = getDb()
    .prepare(
      `SELECT
         SUM(CASE WHEN json_extract(props, '$.hasTrailer') = 1 THEN 1 ELSE 0 END) AS withTrailer,
         SUM(CASE WHEN json_extract(props, '$.hasTrailer') = 0 THEN 1 ELSE 0 END) AS withoutTrailer,
         SUM(CASE WHEN json_extract(props, '$.hasProvider') = 1 THEN 1 ELSE 0 END) AS withProvider,
         SUM(CASE WHEN json_extract(props, '$.hasProvider') = 0 THEN 1 ELSE 0 END) AS withoutProvider
       FROM events WHERE type = 'movie_view' AND props IS NOT NULL AND json_valid(props) AND created_at BETWEEN ? AND ?`,
    )
    .get(r.from, r.to) as Record<string, number | null>;
  return {
    withTrailer: row.withTrailer ?? 0,
    withoutTrailer: row.withoutTrailer ?? 0,
    withProvider: row.withProvider ?? 0,
    withoutProvider: row.withoutProvider ?? 0,
  };
}

export function topPaths(r: Range, limit = 10): { path: string; count: number }[] {
  return getDb()
    .prepare(
      `SELECT path, COUNT(*) AS count FROM events WHERE type = 'page_view' AND path IS NOT NULL AND created_at BETWEEN ? AND ?
       GROUP BY path ORDER BY count DESC LIMIT ?`,
    )
    .all(r.from, r.to, limit) as unknown as { path: string; count: number }[];
}

export function eventStorageInfo(): { total: number; oldest: number | null } {
  const row = getDb().prepare("SELECT COUNT(*) AS total, MIN(created_at) AS oldest FROM events").get() as { total: number; oldest: number | null };
  return row;
}

export function deleteEventsBefore(ts: number): number {
  return Number(getDb().prepare("DELETE FROM events WHERE created_at < ?").run(ts).changes);
}
