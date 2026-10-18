import type { Metadata } from "next";
import Link from "next/link";
import { BarList, SplitBar } from "@/components/admin/charts";
import { QuickHideButton } from "@/components/admin/forms";
import { AdminPageHeader, Panel, RangeTabs, StatCard } from "@/components/admin/ui";
import { movieAnalyticsData } from "@/lib/admin/queries";
import { parseRange } from "@/lib/admin/range";
import { requireAdmin } from "@/lib/auth/session";
import { localeTags } from "@/lib/i18n/config";
import { getAdminT } from "@/lib/i18n/server";
import { genreName } from "@/lib/movies/genres";

export async function generateMetadata(): Promise<Metadata> {
  const { at } = await getAdminT();
  return { title: at("movies.title") };
}

export default async function AdminMoviesPage({ searchParams }: PageProps<"/admin/movies">) {
  await requireAdmin("/admin/movies");
  const { at, locale } = await getAdminT();
  const range = parseRange((await searchParams).range);
  const d = movieAnalyticsData(range);
  const tag = localeTags[locale];
  const movieItems = (list: { movieId: number; title: string; count: number }[]) =>
    list.map((m) => ({ key: m.movieId, label: m.title, value: m.count, href: `/movie/${m.movieId}` }));

  return (
    <>
      <AdminPageHeader title={at("movies.title")} subtitle={at("movies.subtitle")} actions={<RangeTabs range={range} basePath="/admin/movies" at={at} />} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel at={at} title={at("movies.mostViewed")} source="events">
          {d.mostViewed.length ? (
            <ol className="divide-y divide-line">
              {d.mostViewed.map((m, i) => (
                <li key={m.movieId} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-5 text-right text-xs text-subtle tabular-nums">{i + 1}</span>
                  <Link href={`/movie/${m.movieId}`} className="min-w-0 flex-1 truncate hover:text-accent">
                    {m.title}
                  </Link>
                  <span className="text-xs text-muted tabular-nums">
                    {m.count.toLocaleString(tag)} {at("movies.views")}
                  </span>
                  <QuickHideButton movieId={m.movieId} />
                </li>
              ))}
            </ol>
          ) : (
            <BarList emptyLabel={at("empty.noData")} items={[]} />
          )}
        </Panel>
        <Panel at={at} title={at("movies.genres")} hint={at("movies.genresHint")} source="events">
          <BarList color="#7dd3fc" emptyLabel={at("empty.noData")} items={d.genres.slice(0, 10).map((g) => ({ key: g.genreId, label: genreName(g.genreId, locale) ?? `#${g.genreId}`, value: g.count }))} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel at={at} title={at("movies.watchlistAdds")} source="events">
          <BarList color="#79c99a" emptyLabel={at("empty.noData")} items={movieItems(d.watchlistAdds)} />
        </Panel>
        <Panel at={at} title={at("movies.favorites")} source="events">
          <BarList color="#f0715e" emptyLabel={at("empty.noData")} items={movieItems(d.favorites)} />
        </Panel>
        <Panel at={at} title={at("movies.searched")} source="events">
          <BarList color="#c4b5fd" emptyLabel={at("empty.noData")} items={movieItems(d.searched)} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel at={at} title={at("movies.trending")} hint={at("movies.trendingHint")} source="events">
          <BarList
            emptyLabel={at("empty.noData")}
            items={d.trending.map((m) => ({ key: m.movieId, label: `${m.title} (${m.previous} → ${m.count})`, value: m.delta, href: `/movie/${m.movieId}` }))}
            valueSuffix=" ↑"
          />
        </Panel>
        <Panel at={at} title={at("movies.playback")} source="events">
          <div className="space-y-5">
            <SplitBar a={d.playback.withTrailer} b={d.playback.withoutTrailer} labelA={at("movies.trailerAvailable")} labelB={at("movies.trailerMissing")} />
            <SplitBar a={d.playback.withProvider} b={d.playback.withoutProvider} labelA={at("movies.providerAvailable")} labelB={at("movies.providerMissing")} />
            <div className="grid grid-cols-2 gap-3">
              <StatCard at={at} label={at("movies.playbackStarts")} value={d.playbackStarts.toLocaleString(tag)} />
              <StatCard at={at} label={at("movies.playbackErrors")} value={d.playbackErrors.toLocaleString(tag)} tone={d.playbackErrors ? "warn" : "default"} />
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
