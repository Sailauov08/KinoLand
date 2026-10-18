import "server-only";
import type { Locale } from "@/lib/i18n/config";
import { getMovieSummaries } from "./service";
import { fromSnapshot, type MovieSnapshot, type MovieSummary } from "./types";

/**
 * Renders saved lists (watchlists, favourites) with fresh TMDB data in the viewer's language.
 * Stored snapshots — themselves copies of earlier TMDB data — are only used while TMDB is
 * unreachable or for titles TMDB no longer returns. Fresh results are written back via `persist`
 * so snapshots stay current (e.g. a poster added on TMDB later).
 */
export async function withFreshData(
  snapshots: MovieSnapshot[],
  locale: Locale,
  persist?: (fresh: MovieSummary[]) => void,
): Promise<MovieSummary[]> {
  if (!snapshots.length) return [];
  const res = await getMovieSummaries(snapshots.map((s) => s.id), locale);
  if (!res.ok) return snapshots.map(fromSnapshot);
  const fresh = [...res.data.values()];
  if (persist && fresh.length) persist(fresh);
  return snapshots.map((s) => res.data.get(s.id) ?? fromSnapshot(s));
}
