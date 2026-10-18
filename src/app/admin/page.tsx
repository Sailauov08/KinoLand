import type { Metadata } from "next";
import Link from "next/link";
import { BarList, TimeSeriesChart } from "@/components/admin/charts";
import { AdminPageHeader, EmptyNote, Panel, RangeTabs, StatCard } from "@/components/admin/ui";
import { overviewData } from "@/lib/admin/queries";
import { parseRange } from "@/lib/admin/range";
import { requireAdmin } from "@/lib/auth/session";
import { localeTags } from "@/lib/i18n/config";
import { getAdminT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { at } = await getAdminT();
  return { title: at("overview.title") };
}

export default async function AdminOverviewPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin("/admin");
  const { at, locale } = await getAdminT();
  const range = parseRange((await searchParams).range);
  const d = await overviewData(range);
  const tag = localeTags[locale];
  const fmt = (n: number) => n.toLocaleString(tag);
  const time = (ts: number) => new Date(ts).toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <AdminPageHeader title={at("overview.title")} subtitle={at("overview.subtitle")} actions={<RangeTabs range={range} basePath="/admin" at={at} />} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard at={at} source="db" label={at("overview.totalUsers")} value={fmt(d.users.total)} />
        <StatCard at={at} source="db" label={at("overview.newToday")} value={fmt(d.users.newToday)} />
        <StatCard at={at} source="db" label={at("overview.newWeek")} value={fmt(d.users.newThisWeek)} />
        <StatCard at={at} source="events" label={at("overview.visitors")} value={fmt(d.visitorDays)} hint={at("overview.visitorsHint")} />
        <StatCard at={at} source="events" label={at("overview.pageViews")} value={fmt(d.pageViews)} />
        <StatCard at={at} source="events" label={at("overview.movieViews")} value={fmt(d.movieViews)} />
        <StatCard at={at} source="events" label={at("overview.searches")} value={fmt(d.searches)} />
        <StatCard at={at} source="events" label={at("overview.watchlistInteractions")} value={fmt(d.watchlistInteractions)} hint={at("overview.watchlistHint")} />
      </div>
      <p className="mt-3 text-xs text-subtle">{at("source.note")}</p>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel at={at} title={at("overview.visits")} source="events">
          {d.pageViews ? (
            <TimeSeriesChart
              locale={tag}
              label={at("overview.visits")}
              series={[
                { label: at("series.views"), color: "#e8b44c", points: d.visitsSeries.views },
                { label: at("series.visitors"), color: "#7dd3fc", points: d.visitsSeries.visitors },
              ]}
            />
          ) : (
            <EmptyNote>{at("empty.noEvents")}</EmptyNote>
          )}
        </Panel>
        <Panel at={at} title={at("overview.userGrowth")} source="db" hint={`${at("overview.newSignups")}: ${fmt(d.newInRange)}`}>
          <TimeSeriesChart locale={tag} label={at("overview.userGrowth")} series={[{ label: at("overview.totalAccounts"), color: "#79c99a", points: d.growth }]} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel at={at} title={at("overview.interactions")} source="events">
          {d.movieViews || d.watchlistInteractions || d.searches ? (
            <TimeSeriesChart
              locale={tag}
              label={at("overview.interactions")}
              series={[
                { label: at("series.movieViews"), color: "#e8b44c", points: d.interactions.movieViews },
                { label: at("series.watchlistAdds"), color: "#79c99a", points: d.interactions.watchlistAdds },
                { label: at("series.searches"), color: "#c4b5fd", points: d.interactions.searches },
              ]}
            />
          ) : (
            <EmptyNote>{at("empty.noEvents")}</EmptyNote>
          )}
        </Panel>
        <Panel at={at} title={at("overview.popularMovies")} source="events">
          <BarList
            emptyLabel={at("empty.noData")}
            items={d.popularMovies.map((m) => ({ key: m.movieId, label: m.title, value: m.count, href: `/movie/${m.movieId}` }))}
          />
        </Panel>
      </div>

      <Panel at={at} className="mt-4" title={at("overview.recentErrors")} source="db" action={<Link href="/admin/health" className="text-xs font-semibold text-accent hover:text-accent-strong">{at("nav.health")} →</Link>}>
        {d.recentErrors.length ? (
          <ul className="divide-y divide-line">
            {d.recentErrors.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-4">
                <span className="w-40 shrink-0 text-xs text-subtle tabular-nums">{time(e.createdAt)}</span>
                <span className="w-16 shrink-0 text-xs font-semibold text-muted uppercase">{e.source}</span>
                <span className="font-mono text-xs text-danger">{e.event}</span>
                <span className="min-w-0 truncate text-xs text-muted">{e.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>{at("empty.noErrors")}</EmptyNote>
        )}
      </Panel>
    </>
  );
}
