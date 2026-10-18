import type { Metadata } from "next";
import { BarList, TimeSeriesChart } from "@/components/admin/charts";
import { AdminPageHeader, EmptyNote, Panel, RangeTabs, StatCard } from "@/components/admin/ui";
import { watchlistData } from "@/lib/admin/queries";
import { parseRange } from "@/lib/admin/range";
import { requireAdmin } from "@/lib/auth/session";
import { localeTags } from "@/lib/i18n/config";
import { getAdminT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { at } = await getAdminT();
  return { title: at("watchlists.title") };
}

export default async function AdminWatchlistsPage({ searchParams }: PageProps<"/admin/watchlists">) {
  await requireAdmin("/admin/watchlists");
  const { at, locale } = await getAdminT();
  const range = parseRange((await searchParams).range);
  const d = watchlistData(range);
  const tag = localeTags[locale];
  const fmt = (n: number) => n.toLocaleString(tag);
  const hasActivity = d.adds.some((p) => p.value) || d.removes.some((p) => p.value);

  return (
    <>
      <AdminPageHeader title={at("watchlists.title")} subtitle={at("watchlists.subtitle")} actions={<RangeTabs range={range} basePath="/admin/watchlists" at={at} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard at={at} source="db" label={at("watchlists.totalWatchlist")} value={fmt(d.totalWatchlist)} />
        <StatCard at={at} source="db" label={at("watchlists.totalFavorites")} value={fmt(d.totalFavorites)} />
        <StatCard at={at} source="db" label={at("watchlists.usersWithLists")} value={fmt(d.usersWithLists)} />
        <StatCard at={at} source="db" label={at("watchlists.avgPerUser")} value={d.avgPerUser.toLocaleString(tag, { maximumFractionDigits: 1 })} />
      </div>

      <Panel at={at} className="mt-4" title={at("watchlists.activity")} source="events">
        {hasActivity ? (
          <TimeSeriesChart
            locale={tag}
            label={at("watchlists.activity")}
            series={[
              { label: at("watchlists.adds"), color: "#79c99a", points: d.adds },
              { label: at("watchlists.removes"), color: "#f0715e", points: d.removes },
            ]}
          />
        ) : (
          <EmptyNote>{at("empty.noData")}</EmptyNote>
        )}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel at={at} title={at("watchlists.mostSaved")} source="db">
          <BarList color="#79c99a" emptyLabel={at("empty.noData")} items={d.mostSaved.map((m) => ({ key: m.movieId, label: m.title, value: m.count, href: `/movie/${m.movieId}` }))} />
        </Panel>
        <Panel at={at} title={at("watchlists.mostFavorited")} source="db">
          <BarList color="#f0715e" emptyLabel={at("empty.noData")} items={d.mostFavorited.map((m) => ({ key: m.movieId, label: m.title, value: m.count, href: `/movie/${m.movieId}` }))} />
        </Panel>
      </div>
    </>
  );
}
