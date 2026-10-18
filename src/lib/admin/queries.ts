import "server-only";
import { getDb } from "@/lib/db";
import { countErrorsSince, errorsByDay, recentErrors } from "@/lib/db/errors";
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
import { countUsersBefore, getUserStats, signupsByDay } from "@/lib/db/users";
import { fillDays, rangeBounds, type RangeKey } from "./range";

export function overviewData(key: RangeKey) {
  const { from, to, days } = rangeBounds(key);
  const r: Range = { from, to };
  const users = getUserStats();
  const visits = visitsByDay(r);
  const counts = countsByType(r);

  // Cumulative registered users per day: accounts before the range + daily sign-ups.
  let running = countUsersBefore(from);
  const growth = fillDays(signupsByDay(from), from, days, (row) => row?.count ?? 0).map((p) => ({ day: p.day, value: (running += p.value) }));
  const series = seriesByDay(["movie_view", "watchlist_add", "movie_search"], r);
  const pick = (type: string) => fillDays(series.filter((s) => s.type === type), from, days, (row) => row?.count ?? 0);

  return {
    range: { from, to, days },
    users,
    newInRange: getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE created_at >= ?").get(from) as { n: number },
    pageViews: counts.page_view ?? 0,
    // Unique visitors are counted per day (the anonymous hash rotates daily), then summed.
    visitorDays: visits.reduce((a, v) => a + v.visitors, 0),
    movieViews: counts.movie_view ?? 0,
    searches: counts.movie_search ?? 0,
    watchlistInteractions: (counts.watchlist_add ?? 0) + (counts.watchlist_remove ?? 0),
    growth,
    visitsSeries: {
      views: fillDays(visits, from, days, (row) => row?.views ?? 0),
      visitors: fillDays(visits, from, days, (row) => row?.visitors ?? 0),
    },
    interactions: { movieViews: pick("movie_view"), watchlistAdds: pick("watchlist_add"), searches: pick("movie_search") },
    popularMovies: topMovies("movie_view", r, 8),
    recentErrors: recentErrors(6),
    errors24h: countErrorsSince(Date.now() - 86_400_000),
  };
}

export function analyticsData(key: RangeKey) {
  const { from, to, days } = rangeBounds(key);
  const r = { from, to };
  const visits = visitsByDay(r);
  return {
    range: { from, to, days },
    counts: countsByType(r),
    visitorDays: visits.reduce((a, v) => a + v.visitors, 0),
    views: fillDays(visits, from, days, (row) => row?.views ?? 0),
    visitors: fillDays(visits, from, days, (row) => row?.visitors ?? 0),
    topPaths: topPaths(r, 12),
  };
}

export function movieAnalyticsData(key: RangeKey) {
  const { from, to } = rangeBounds(key);
  const r = { from, to };
  const now = Date.now();
  const last7 = topMovies("movie_view", { from: now - 7 * 86_400_000, to: now }, 50);
  const prev7 = new Map(topMovies("movie_view", { from: now - 14 * 86_400_000, to: now - 7 * 86_400_000 }, 200).map((m) => [m.movieId, m.count]));
  const trending = last7
    .map((m) => ({ ...m, previous: prev7.get(m.movieId) ?? 0, delta: m.count - (prev7.get(m.movieId) ?? 0) }))
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 8);
  return {
    mostViewed: topMovies("movie_view", r, 10),
    genres: genreCounts(r),
    watchlistAdds: topMovies("watchlist_add", r, 10),
    favorites: topMovies("favorite_add", r, 10),
    searched: topMovies("movie_search", r, 10),
    trending,
    playback: playbackAvailability(r),
    playbackStarts: countEvents("playback_started", r),
    playbackErrors: countEvents("playback_error", r),
  };
}

export function searchAnalyticsData(key: RangeKey) {
  const { from, to, days } = rangeBounds(key);
  const r = { from, to };
  const summary = searchSummary(r);
  const top = topSearches(r, 25);
  return {
    summary,
    top,
    zero: top.filter((q) => q.zeroResults > 0).sort((a, b) => b.zeroResults - a.zeroResults).slice(0, 12),
    overTime: fillDays(seriesByDay(["movie_search"], r), from, days, (row) => row?.count ?? 0),
  };
}

/** Aggregate list statistics. Deliberately no per-user listing (lists are private). */
export function watchlistData(key: RangeKey) {
  const db = getDb();
  const { from, to, days } = rangeBounds(key);
  const n = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  const top = (list: "watchlist" | "favorite") =>
    (
      db
        .prepare(
          `SELECT movie_id AS movieId, COUNT(*) AS count, MAX(json_extract(snapshot, '$.title')) AS title
           FROM list_items WHERE list = ? GROUP BY movie_id ORDER BY count DESC, MAX(added_at) DESC LIMIT 10`,
        )
        .all(list) as unknown as { movieId: number; count: number; title: string | null }[]
    ).map((m) => ({ ...m, title: m.title ?? `#${m.movieId}` }));
  const series = seriesByDay(["watchlist_add", "watchlist_remove"], { from, to });
  const usersWithLists = n("SELECT COUNT(DISTINCT user_id) AS n FROM list_items");
  const totalWatchlist = n("SELECT COUNT(*) AS n FROM list_items WHERE list = 'watchlist'");
  const totalFavorites = n("SELECT COUNT(*) AS n FROM list_items WHERE list = 'favorite'");
  return {
    totalWatchlist,
    totalFavorites,
    usersWithLists,
    avgPerUser: usersWithLists ? (totalWatchlist + totalFavorites) / usersWithLists : 0,
    mostSaved: top("watchlist"),
    mostFavorited: top("favorite"),
    adds: fillDays(series.filter((s) => s.type === "watchlist_add"), from, days, (row) => row?.count ?? 0),
    removes: fillDays(series.filter((s) => s.type === "watchlist_remove"), from, days, (row) => row?.count ?? 0),
  };
}

export function errorTrend(days = 14) {
  const begin = new Date();
  begin.setHours(0, 0, 0, 0);
  begin.setDate(begin.getDate() - (days - 1));
  const rows = errorsByDay(begin.getTime());
  return {
    server: fillDays(rows, begin.getTime(), days, (row) => row?.server ?? 0),
    client: fillDays(rows, begin.getTime(), days, (row) => row?.client ?? 0),
  };
}
