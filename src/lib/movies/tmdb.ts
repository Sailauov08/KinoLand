import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const BASE_URL = "https://api.themoviedb.org/3";

export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

/**
 * Thin TMDB v3 client. Responses are cached in the Next.js data cache
 * (`revalidate` seconds) so repeated page views don't hit the API.
 */
export async function tmdbFetch(path: string, params: Params = {}, revalidate = 3600): Promise<unknown> {
  if (!env.tmdbToken && !env.tmdbApiKey) throw new TmdbError("TMDB is not configured", null);

  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers: HeadersInit = { accept: "application/json" };
  if (env.tmdbToken) headers.Authorization = `Bearer ${env.tmdbToken}`;
  else url.searchParams.set("api_key", env.tmdbApiKey!);

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, { headers, next: { revalidate }, signal: AbortSignal.timeout(8000) });
  } catch (err) {
    logger.warn("tmdb.network_error", { path, error: err instanceof Error ? err.message : String(err) });
    throw new TmdbError("TMDB request failed", null);
  }
  if (!res.ok) {
    logger.warn("tmdb.http_error", { path, status: res.status, ms: Date.now() - started });
    throw new TmdbError(`TMDB responded ${res.status}`, res.status);
  }
  return res.json();
}
