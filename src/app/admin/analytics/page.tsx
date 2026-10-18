import type { Metadata } from "next";
import { BarList, TimeSeriesChart } from "@/components/admin/charts";
import { AdminPageHeader, EmptyNote, Panel, RangeTabs, StatCard } from "@/components/admin/ui";
import { posthogPageviews } from "@/lib/admin/posthog";
import { analyticsData } from "@/lib/admin/queries";
import { fillDays, parseRange, rangeBounds } from "@/lib/admin/range";
import { requireAdmin } from "@/lib/auth/session";
import { EVENT_TYPES } from "@/lib/db/events";
import { isPosthogConfigured } from "@/lib/env";
import { localeTags } from "@/lib/i18n/config";
import { getAdminT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { at } = await getAdminT();
  return { title: at("analytics.title") };
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireAdmin("/admin/analytics");
  const { at, locale } = await getAdminT();
  const range = parseRange((await searchParams).range);
  const d = analyticsData(range);
  const tag = localeTags[locale];
  const fmt = (n: number) => n.toLocaleString(tag);
  const ph = await posthogPageviews(d.range.days);
  const { from, days } = rangeBounds(range);

  return (
    <>
      <AdminPageHeader title={at("analytics.title")} subtitle={at("analytics.subtitle")} actions={<RangeTabs range={range} basePath="/admin/analytics" at={at} />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard at={at} source="events" label={at("overview.pageViews")} value={fmt(d.counts.page_view ?? 0)} />
        <StatCard at={at} source="events" label={at("overview.visitors")} value={fmt(d.visitorDays)} hint={at("overview.visitorsHint")} />
        <StatCard at={at} source="events" label={at("overview.movieViews")} value={fmt(d.counts.movie_view ?? 0)} />
        <StatCard at={at} source="events" label={at("overview.searches")} value={fmt(d.counts.movie_search ?? 0)} />
      </div>

      <Panel at={at} className="mt-4" title={at("overview.visits")} source="events" hint={at("analytics.privacy")}>
        {d.counts.page_view ? (
          <TimeSeriesChart
            locale={tag}
            label={at("overview.visits")}
            series={[
              { label: at("series.views"), color: "#e8b44c", points: d.views },
              { label: at("series.visitors"), color: "#7dd3fc", points: d.visitors },
            ]}
          />
        ) : (
          <EmptyNote>{at("empty.noEvents")}</EmptyNote>
        )}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel at={at} title={at("analytics.topPages")} source="events">
          <BarList emptyLabel={at("empty.noData")} items={d.topPaths.map((p) => ({ key: p.path, label: <span className="font-mono text-xs">{p.path}</span>, value: p.count }))} />
        </Panel>
        <Panel at={at} title={at("analytics.eventsByType")} source="events">
          <BarList
            color="#7dd3fc"
            emptyLabel={at("empty.noData")}
            items={EVENT_TYPES.filter((type) => d.counts[type]).map((type) => ({ key: type, label: <span className="font-mono text-xs">{type}</span>, value: d.counts[type] ?? 0 }))}
          />
        </Panel>
      </div>

      <Panel at={at} className="mt-4" title={at("analytics.posthogTitle")} source="posthog">
        {ph === null ? (
          <p className="text-sm text-muted">{isPosthogConfigured() ? at("analytics.posthogIngestOnly") : at("analytics.posthogOff")}</p>
        ) : ph === "error" ? (
          <p className="text-sm text-danger">{at("analytics.posthogError")}</p>
        ) : (
          <>
            <TimeSeriesChart locale={tag} label={at("analytics.posthogPageviews")} series={[{ label: at("analytics.posthogPageviews"), color: "#c4b5fd", points: fillDays(ph, from, days, (r) => r?.value ?? 0) }]} />
            <p className="mt-3 text-xs text-subtle">{at("analytics.posthogConsent")}</p>
          </>
        )}
      </Panel>
    </>
  );
}
