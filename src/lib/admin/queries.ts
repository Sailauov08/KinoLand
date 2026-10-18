import "server-only";
import { count, q } from "@/lib/db";
import { countErrorsLast24h, errorsByDay, recentErrors } from "@/lib/db/errors";
import {
  countEvents,
  countsByType,
  genreCounts,
  playbackAvailability,
  searchSummary,
  seriesByDay,
  topMovies,
  topPaths,
  topSearches,
  visitsByDay,
  type Range,
} from "@/lib/db/events";
import { countUsersBefore, countUsersSince, getUserStats, signupsByDay } from "@/lib/db/users";
import { env } from "@/lib/env";
import { startOfDayInTz } from "@/lib/time";
import { fillDays, rangeBounds, type RangeKey } from "./range";

const TZ = () => env.appTimezone;

export async function overviewData(key: RangeKey) {
  const { from, to, days } = rangeBounds(key, TZ());
  const r: Range = { from, to };
  const fill = <T extends { day: string }>(rows: T[], pick: (row: T | undefined) => number) => fillDays(rows, from, days, pick, TZ());

  const [users, visits, counts, before, signups, series, popularMovies, errors, errors24h, newInRange] = await Promise.all([
    getUserStats(),
    visitsByDay(r),
    countsByType(r),
    countUsersBefore(from),
    signupsByDay(from),
    seriesByDay(["movie_view", "watchlist_add", "movie_search"], r),
    topMovies("movie_view", r, 8),
    recentErrors(6),
    countErrorsLast24h(),
    countUsersSince(from),
  ]);

  // Cumulative registered users per day: accounts before the range + daily sign-ups.
  let running = before;
  const growth = fill(signups, (row) => row?.count ?? 0).map((p) => ({ day: p.day, value: (running += p.value) }));
  const pick = (type: string) => fill(series.filter((s) => s.type === type), (row) => row?.count ?? 0);

  return {
    range: { from, to, days },
    users,
    newInRange,
    pageViews: counts.page_view ?? 0,
    // Unique visitors are counted per day (the anonymous hash rotates daily), then summed.
    visitorDays: visits.reduce((a, v) => a + Number(v.visitors), 0),
    movieViews: counts.movie_view ?? 0,
    searches: counts.movie_search ?? 0,
    watchlistInteractions: (counts.watchlist_add ?? 0) + (counts.watchlist_remove ?? 0),
    growth,
    visitsSeries: {
      views: fill(visits, (row) => row?.views ?? 0),
      visitors: fill(visits, (row) => row?.visitors ?? 0),
    },
    interactions: { movieViews: pick("movie_view"), watchlistAdds: pick("watchlist_add"), searches: pick("movie_search") },
    popularMovies,
    recentErrors: errors,
    errors24h,
  };
}

export async function analyticsData(key: RangeKey) {
  const { from, to, days } = rangeBounds(key, TZ());
  const r = { from, to };
  const [visits, counts, paths] = await Promise.all([visitsByDay(r), countsByType(r), topPaths(r, 12)]);
  return {
    range: { from, to, days },
    counts,
    visitorDays: visits.reduce((a, v) => a + Number(v.visitors), 0),
    views: fillDays(visits, from, days, (row) => row?.views ?? 0, TZ()),
    visitors: fillDays(visits, from, days, (row) => row?.visitors ?? 0, TZ()),
    topPaths: paths,
  };
}

export async function movieAnalyticsData(key: RangeKey) {
  const { from, to } = rangeBounds(key, TZ());
  const r = { from, to };
  const now = Date.now();
  const [mostViewed, genres, watchlistAdds, favorites, searched, last7, prev7List, playback, playbackStarts, playbackErrors] = await Promise.all([
    topMovies("movie_view", r, 10),
    genreCounts(r),
    topMovies("watchlist_add", r, 10),
    topMovies("favorite_add", r, 10),
    topMovies("movie_search", r, 10),
    topMovies("movie_view", { from: now - 7 * 86_400_000, to: now }, 50),
    topMovies("movie_view", { from: now - 14 * 86_400_000, to: now - 7 * 86_400_000 }, 200),
    playbackAvailability(r),
    countEvents("playback_started", r),
    countEvents("playback_error", r),
  ]);
  const prev7 = new Map(prev7List.map((m) => [m.movieId, m.count]));
  const trending = last7
    .map((m) => ({ ...m, previous: prev7.get(m.movieId) ?? 0, delta: m.count - (prev7.get(m.movieId) ?? 0) }))
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 8);
  return { mostViewed, genres, watchlistAdds, favorites, searched, trending, playback, playbackStarts, playbackErrors };
}

export async function searchAnalyticsData(key: RangeKey) {
  const { from, to, days } = rangeBounds(key, TZ());
  const r = { from, to };
  const [summary, top, series] = await Promise.all([searchSummary(r), topSearches(r, 25), seriesByDay(["movie_search"], r)]);
  return {
    summary,
    top,
    zero: top.filter((x) => x.zeroResults > 0).sort((a, b) => b.zeroResults - a.zeroResults).slice(0, 12),
    overTime: fillDays(series, from, days, (row) => row?.count ?? 0, TZ()),
  };
}

/** Aggregate list statistics. Deliberately no per-user listing (lists are private). */
export async function watchlistData(key: RangeKey) {
  const { from, to, days } = rangeBounds(key, TZ());
  const top = async (list: "watchlist" | "favorite") =>
    (
      await q<{ movie_id: number; count: number; title: string | null }>(
        `SELECT movie_id, COUNT(*)::int AS count, MAX(snapshot->>'title') AS title
         FROM kinoland.list_items WHERE list = $1 GROUP BY movie_id ORDER BY count DESC, MAX(added_at) DESC LIMIT 10`,
        [list],
      )
    ).map((m) => ({ movieId: m.movie_id, count: Number(m.count), title: m.title ?? `#${m.movie_id}` }));
  const [series, usersWithLists, totalWatchlist, totalFavorites, mostSaved, mostFavorited] = await Promise.all([
    seriesByDay(["watchlist_add", "watchlist_remove"], { from, to }),
    count("SELECT COUNT(DISTINCT user_id)::int AS n FROM kinoland.list_items"),
    count("SELECT COUNT(*)::int AS n FROM kinoland.list_items WHERE list = 'watchlist'"),
    count("SELECT COUNT(*)::int AS n FROM kinoland.list_items WHERE list = 'favorite'"),
    top("watchlist"),
    top("favorite"),
  ]);
  return {
    totalWatchlist,
    totalFavorites,
    usersWithLists,
    avgPerUser: usersWithLists ? (totalWatchlist + totalFavorites) / usersWithLists : 0,
    mostSaved,
    mostFavorited,
    adds: fillDays(series.filter((s) => s.type === "watchlist_add"), from, days, (row) => row?.count ?? 0, TZ()),
    removes: fillDays(series.filter((s) => s.type === "watchlist_remove"), from, days, (row) => row?.count ?? 0, TZ()),
  };
}

export async function errorTrend(days = 14) {
  const begin = startOfDayInTz(Date.now(), TZ(), days - 1);
  const rows = await errorsByDay(begin);
  return {
    server: fillDays(rows, begin, days, (row) => row?.server ?? 0, TZ()),
    client: fillDays(rows, begin, days, (row) => row?.client ?? 0, TZ()),
  };
}
