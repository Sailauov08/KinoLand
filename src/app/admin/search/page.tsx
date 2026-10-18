import clsx from "clsx";
import type { Metadata } from "next";
import { BarList, TimeSeriesChart } from "@/components/admin/charts";
import { AdminPageHeader, EmptyNote, Panel, RangeTabs, StatCard, tableCls } from "@/components/admin/ui";
import { searchAnalyticsData } from "@/lib/admin/queries";
import { parseRange } from "@/lib/admin/range";
import { requireAdmin } from "@/lib/auth/session";
import { localeTags } from "@/lib/i18n/config";
import { getAdminT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { at } = await getAdminT();
  return { title: at("search.title") };
}

export default async function AdminSearchPage({ searchParams }: PageProps<"/admin/search">) {
  await requireAdmin("/admin/search");
  const { at, locale } = await getAdminT();
  const range = parseRange((await searchParams).range);
  const d = await searchAnalyticsData(range);
  const tag = localeTags[locale];
  const fmt = (n: number) => n.toLocaleString(tag);
  const zeroRate = d.summary.total ? Math.round((d.summary.zeroResults / d.summary.total) * 100) : 0;

  return (
    <>
      <AdminPageHeader title={at("search.title")} subtitle={at("search.subtitle")} actions={<RangeTabs range={range} basePath="/admin/search" at={at} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard at={at} source="events" label={at("search.total")} value={fmt(d.summary.total)} />
        <StatCard at={at} source="events" label={at("search.textSearches")} value={fmt(d.summary.withQuery)} />
        <StatCard at={at} source="events" label={at("search.filterSearches")} value={fmt(d.summary.filterOnly)} />
        <StatCard at={at} source="events" label={at("search.zeroRate")} value={`${zeroRate}%`} tone={zeroRate > 30 ? "warn" : "default"} />
      </div>

      <Panel at={at} className="mt-4" title={at("search.overTime")} source="events">
        {d.summary.total ? <TimeSeriesChart locale={tag} label={at("search.overTime")} series={[{ label: at("series.searches"), color: "#c4b5fd", points: d.overTime }]} /> : <EmptyNote>{at("empty.noEvents")}</EmptyNote>}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel at={at} title={at("search.topQueries")} source="events">
          {d.top.length ? (
            <div className={tableCls.wrap}>
              <table className={tableCls.table}>
                <thead className={tableCls.thead}>
                  <tr>
                    <th scope="col" className={tableCls.th}>{at("search.query")}</th>
                    <th scope="col" className={clsx(tableCls.th, "text-right")}>{at("search.count")}</th>
                    <th scope="col" className={clsx(tableCls.th, "text-right")}>{at("search.zero")}</th>
                  </tr>
                </thead>
                <tbody className={tableCls.tbody}>
                  {d.top.map((q) => (
                    <tr key={q.query}>
                      <td className={clsx(tableCls.td, "max-w-[260px] truncate")}>“{q.query}”</td>
                      <td className={clsx(tableCls.td, "text-right tabular-nums")}>{fmt(q.count)}</td>
                      <td className={clsx(tableCls.td, "text-right tabular-nums", q.zeroResults ? "text-danger" : "text-subtle")}>{fmt(q.zeroResults)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyNote>{at("empty.noData")}</EmptyNote>
          )}
        </Panel>
        <Panel at={at} title={at("search.zeroQueries")} source="events">
          <BarList color="#f0715e" emptyLabel={at("empty.noData")} items={d.zero.map((q) => ({ key: q.query, label: `“${q.query}”`, value: q.zeroResults }))} />
        </Panel>
      </div>
    </>
  );
}
