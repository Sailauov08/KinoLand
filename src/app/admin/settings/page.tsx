import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { RetentionForm } from "@/components/admin/forms";
import { AdminPageHeader, EmptyNote, Panel, StatusPill, tableCls } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui";
import { integrationStatus } from "@/lib/admin/health";
import { requireAdmin } from "@/lib/auth/session";
import { listAudit } from "@/lib/db/audit";
import { eventStorageInfo } from "@/lib/db/events";
import { getRetentionDays } from "@/lib/db/settings";
import { localeTags } from "@/lib/i18n/config";
import { getAdminT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { at } = await getAdminT();
  return { title: at("settings.title") };
}

export default async function AdminSettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requireAdmin("/admin/settings");
  const { at, locale } = await getAdminT();
  const tag = localeTags[locale];
  const page = z.coerce.number().int().min(1).catch(1).parse((await searchParams).page);
  const audit = await listAudit({ page, perPage: 25 });
  const storage = await eventStorageInfo();
  const dt = (ts: number) => new Date(ts).toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <AdminPageHeader title={at("settings.title")} subtitle={at("settings.subtitle")} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel at={at} title={at("settings.bootstrap")}>
          <p className="text-sm leading-relaxed text-muted">{at("settings.bootstrapText")}</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-ink px-4 py-3 font-mono text-xs text-accent-strong ring-1 ring-line">
            <code>npm run admin:promote -- you@example.com</code>
          </pre>
        </Panel>
        <Panel at={at} title={at("settings.retention")} hint={at("settings.retentionHint")} source="events">
          <RetentionForm days={await getRetentionDays()} />
          <p className="mt-3 text-xs text-subtle">{at("settings.stored", { n: storage.total.toLocaleString(tag), date: storage.oldest ? dt(storage.oldest) : "—" })}</p>
        </Panel>
      </div>

      <Panel at={at} className="mt-4" title={at("settings.config")} hint={at("settings.configHint")}>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {integrationStatus().map((i) => (
            <li key={i.name} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
              <span className="font-mono text-xs">{i.name}</span>
              <StatusPill ok={i.configured ? true : i.optional ? null : false} label={i.configured ? at("health.configured") : at("health.missing")} />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel at={at} className="mt-4" title={at("settings.audit")} hint={at("settings.auditHint")} source="db">
        {audit.items.length ? (
          <>
            <div className={tableCls.wrap}>
              <table className={clsx(tableCls.table, "min-w-[640px]")}>
                <thead className={tableCls.thead}>
                  <tr>
                    <th scope="col" className={tableCls.th}>{at("settings.col.when")}</th>
                    <th scope="col" className={tableCls.th}>{at("settings.col.actor")}</th>
                    <th scope="col" className={tableCls.th}>{at("settings.col.action")}</th>
                    <th scope="col" className={tableCls.th}>{at("settings.col.target")}</th>
                  </tr>
                </thead>
                <tbody className={tableCls.tbody}>
                  {audit.items.map((a) => (
                    <tr key={a.id}>
                      <td className={clsx(tableCls.td, "text-xs text-muted tabular-nums")}>{dt(a.createdAt)}</td>
                      <td className={clsx(tableCls.td, "text-xs")}>{a.actorName ?? "system"}</td>
                      <td className={clsx(tableCls.td, "font-mono text-xs text-accent")}>{a.action}</td>
                      <td className={clsx(tableCls.td, "text-xs text-muted")}>
                        {a.targetType === "user" && a.targetId ? (
                          <Link href={`/admin/users/${a.targetId}`} className="hover:text-accent">
                            user · {a.targetId.slice(0, 8)}…
                          </Link>
                        ) : a.targetType ? (
                          `${a.targetType} · ${a.targetId ?? ""}`
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {audit.totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between">
                <Link href={`/admin/settings?page=${audit.page - 1}`} className={clsx(buttonClass("secondary", "sm"), audit.page <= 1 && "pointer-events-none opacity-40")}>
                  {at("users.prev")}
                </Link>
                <span className="text-xs text-muted">{at("users.page", { page: audit.page, total: audit.totalPages })}</span>
                <Link href={`/admin/settings?page=${audit.page + 1}`} className={clsx(buttonClass("secondary", "sm"), audit.page >= audit.totalPages && "pointer-events-none opacity-40")}>
                  {at("users.next")}
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyNote>{at("settings.noAudit")}</EmptyNote>
        )}
      </Panel>
    </>
  );
}
