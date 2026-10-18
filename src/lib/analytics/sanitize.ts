/**
 * Privacy rules for analytics input (pure functions, unit tested).
 * - Search text is normalised and dropped entirely when it could contain personal data.
 * - Only whitelisted event types and properties are accepted from the browser.
 */
import { z } from "zod";

const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python-requests|httpclient/i;

export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT_UA.test(userAgent);
}

/** Returns a normalised query safe to store, or null if it may contain personal data. */
export function sanitizeSearchQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = raw.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
  if (!q || q.length > 80) return null;
  if (/@/.test(q)) return null; // emails / handles
  if (/\d[\d\s()+-]{6,}\d/.test(q)) return null; // phone / card / id numbers
  if (/https?:|www\.|\.(com|ru|kz|net|org)\b/.test(q)) return null; // URLs
  return q.slice(0, 60);
}

/** Paths are stored without query strings (they may contain search text or tokens). */
export function sanitizePath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/")) return null;
  const path = raw.split(/[?#]/)[0].slice(0, 120);
  return /^\/[\w\-./%]*$/.test(path) ? path : null;
}

const movieId = z.number().int().positive().max(100_000_000);
const genres = z.array(z.number().int().positive()).max(12);
const title = z.string().trim().max(200);

export const clientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("page_view"), path: z.string() }),
  z.object({
    type: z.literal("movie_view"),
    path: z.string(),
    movieId,
    props: z.object({ title, genres, hasTrailer: z.boolean(), hasProvider: z.boolean() }),
  }),
  z.object({
    type: z.literal("movie_search"),
    path: z.string(),
    props: z.object({
      query: z.string().max(200).optional(),
      results: z.number().int().min(0).max(1_000_000),
      mode: z.enum(["search", "discover"]),
      topMovieId: movieId.optional(),
      topTitle: title.optional(),
      genres: genres.optional(),
    }),
  }),
  z.object({
    type: z.literal("playback_started"),
    path: z.string(),
    movieId,
    props: z.object({ source: z.enum(["trailer", "provider"]), title, provider: z.string().max(60).optional() }),
  }),
  z.object({
    type: z.literal("playback_error"),
    path: z.string(),
    movieId,
    props: z.object({ source: z.enum(["trailer", "provider"]), title, reason: z.string().max(80) }),
  }),
  z.object({ type: z.literal("client_error"), path: z.string(), props: z.object({ message: z.string().max(500), digest: z.string().max(80).optional() }) }),
]);

export type ClientEvent = z.infer<typeof clientEventSchema>;
