import type { Metadata } from "next";
import { TimeSeriesChart } from "@/components/admin/charts";
import { AdminPageHeader, EmptyNote, Panel, StatusPill } from "@/components/admin/ui";
import { databaseHealth, integrationStatus, serverHealth, tmdbHealth } from "@/lib/admin/health";
import { errorTrend } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/session";
import { countErrorsLast24h, recentErrors } from "@/lib/db/errors";
import { env, isPosthogConfigured } from "@/lib/env";
import { localeTags } from "@/lib/i18n/config";
import { getAdminT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { at } = await getAdminT();
  return { title: at("health.title") };
}

const bytes = (n: number | null) => (n === null ? "—" : n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
const duration = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-subtle">{k}</dt>
      <dd className="text-right tabular-nums">{v}</dd>
    </div>
  );
}

export default async function AdminHealthPage() {
  await requireAdmin("/admin/health");
  const { at, locale } = await getAdminT();
  const tag = localeTags[locale];
  const db = databaseHealth();
  const tmdb = await tmdbHealth();
  const server = serverHealth();
  const integrations = integrationStatus();
  const trend = errorTrend(14);
  const errors24h = countErrorsLast24h();
  const errors = recentErrors(15);

  const warnings: string[] = [];
  if (tmdb.ok !== true) warnings.push(at("health.warn.tmdb"));
  warnings.push(at("health.warn.sqlite"));
  if (!isPosthogConfigured()) warnings.push(at("health.warn.posthog"));
  if (!process.env.NEXT_PUBLIC_SITE_URL && env.isProduction) warnings.push(at("health.warn.siteUrl"));
  if (errors24h > 0) warnings.push(at("health.warn.errors", { n: errors24h }));

  return (
    <>
      <AdminPageHeader title={at("health.title")} subtitle={at("health.subtitle")} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel at={at} title={at("health.database")} action={<StatusPill ok={db.ok} label={db.ok ? at("health.ok") : at("health.down")} />}>
          <dl className="divide-y divide-line">
            <Row k={at("health.engine")} v={db.engine} />
            <Row k={at("health.latency")} v={`${db.latencyMs} ms`} />
            <Row k={at("health.schema")} v={`v${db.schemaVersion}`} />
            <Row k={at("health.size")} v={bytes(db.sizeBytes)} />
            {Object.entries(db.rows).map(([t, n]) => (
              <Row key={t} k={`${at("health.tables")}: ${t}`} v={n.toLocaleString(tag)} />
            ))}
          </dl>
        </Panel>
        <Panel at={at} title={at("health.tmdb")} action={<StatusPill ok={tmdb.ok} label={tmdb.ok === null ? at("health.notConfigured") : tmdb.ok ? at("health.ok") : at("health.down")} />}>
          <dl className="divide-y divide-line">
            <Row k={at("health.latency")} v={tmdb.latencyMs === null ? "—" : `${tmdb.latencyMs} ms`} />
            <Row k="HTTP" v={tmdb.status ?? "—"} />
          </dl>
        </Panel>
        <Panel at={at} title={at("health.server")} action={<StatusPill ok label={at("health.ok")} />}>
          <dl className="divide-y divide-line">
            <Row k={at("health.uptime")} v={duration(server.uptimeSec)} />
            <Row k={at("health.memory")} v={bytes(server.rssBytes)} />
            <Row k={at("health.node")} v={server.node} />
            <Row k={at("health.mode")} v={server.mode} />
          </dl>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel at={at} title={at("health.integrations")}>
          <ul className="divide-y divide-line">
            {integrations.map((i) => (
              <li key={i.name} className="flex items-center justify-between gap-3 py-2.5">
                <span className="font-mono text-xs">{i.name}</span>
                <StatusPill ok={i.configured ? true : i.optional ? null : false} label={i.configured ? at("health.configured") : at("health.missing")} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel at={at} title={at("health.warnings")}>
          {warnings.length ? (
            <ul className="space-y-2">
              {warnings.map((w) => (
                <li key={w} className="rounded-xl bg-accent/[0.07] px-3 py-2 text-sm text-accent-strong ring-1 ring-accent/20">
                  {w}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>{at("health.noWarnings")}</EmptyNote>
          )}
        </Panel>
      </div>

      <Panel at={at} className="mt-4" title={at("health.errors")} source="db">
        <TimeSeriesChart
          locale={tag}
          label={at("health.errors")}
          height={140}
          series={[
            { label: at("series.server"), color: "#f0715e", points: trend.server },
            { label: at("series.client"), color: "#c4b5fd", points: trend.client },
          ]}
        />
      </Panel>

      <Panel at={at} className="mt-4" title={at("health.recentErrors")} source="db">
        {errors.length ? (
          <ul className="divide-y divide-line">
            {errors.map((e) => (
              <li key={e.id} className="grid gap-1 py-2.5 text-xs sm:grid-cols-[150px_60px_200px_1fr] sm:gap-3">
                <span className="text-subtle tabular-nums">{new Date(e.createdAt).toLocaleString(tag, { dateStyle: "short", timeStyle: "medium" })}</span>
                <span className="font-semibold text-muted uppercase">{e.source}</span>
                <span className="font-mono text-danger">{e.event}</span>
                <span className="min-w-0 break-words text-muted">
                  {e.message}
                  {e.path ? <span className="ml-2 font-mono text-subtle">{e.path}</span> : null}
                </span>
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
