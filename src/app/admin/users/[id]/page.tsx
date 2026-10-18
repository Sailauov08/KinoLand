import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { setUserRoleAction, setUserStatusAction } from "@/app/actions/admin";
import { ConfirmActionForm } from "@/components/admin/forms";
import { AdminPageHeader, EmptyNote, Panel, StatusPill } from "@/components/admin/ui";
import { ArrowLeftIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/auth/session";
import { listAudit } from "@/lib/db/audit";
import { countActiveSessions, findUserById, listCounts } from "@/lib/db/users";
import { localeNames, localeTags } from "@/lib/i18n/config";
import { getAdminT } from "@/lib/i18n/server";
import { genreName } from "@/lib/movies/genres";

export async function generateMetadata(): Promise<Metadata> {
  const { at } = await getAdminT();
  return { title: at("user.title") };
}

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const me = await requireAdmin(`/admin/users/${id}`);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = findUserById(id);
  if (!user) notFound();
  const { at, locale } = await getAdminT();
  const tag = localeTags[locale];
  const dt = (ts: number | null) => (ts ? new Date(ts).toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" }) : at("users.never"));
  const sessions = countActiveSessions(user.id);
  const lists = listCounts(user.id);
  const history = listAudit({ targetId: user.id, perPage: 20 });
  const isSelf = user.id === me.id;

  const facts: [string, React.ReactNode][] = [
    [at("user.id"), <span key="id" className="font-mono text-xs break-all">{user.id}</span>],
    [at("user.name"), user.name],
    [at("user.email"), user.email],
    [at("users.col.role"), at(`users.role.${user.role}`)],
    [at("users.col.status"), <StatusPill key="st" ok={user.status === "active"} label={at(`users.status.${user.status}`)} />],
    [at("user.registered"), dt(user.createdAt)],
    [at("user.lastSeen"), dt(user.lastSeenAt)],
    [at("user.language"), user.locale ? localeNames[user.locale] : "—"],
    [at("user.genres"), user.preferredGenres.map((g) => genreName(g, locale)).filter(Boolean).join(", ") || "—"],
    [at("user.sessions"), sessions],
    [at("user.lists"), `${lists.watchlist} / ${lists.favorite}`],
  ];

  return (
    <>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeftIcon size={16} /> {at("user.back")}
      </Link>
      <AdminPageHeader title={user.name} subtitle={at("user.title")} />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel at={at} title={at("user.title")} source="db">
          <dl className="divide-y divide-line">
            {facts.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:justify-between sm:gap-6">
                <dt className="shrink-0 text-subtle">{k}</dt>
                <dd className="min-w-0 text-fg/90 sm:text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <div className="space-y-4">
          <Panel at={at} title={at("user.actions")}>
            {isSelf ? (
              <p className="text-sm text-muted">{at("user.selfNote")}</p>
            ) : (
              <div className="flex flex-col gap-4">
                {user.status === "active" ? (
                  <ConfirmActionForm action={setUserStatusAction} fields={{ userId: user.id, status: "suspended" }} label={at("user.suspend")} confirmText={at("user.suspendConfirm")} tone="danger" />
                ) : (
                  <ConfirmActionForm action={setUserStatusAction} fields={{ userId: user.id, status: "active" }} label={at("user.reactivate")} confirmText={at("user.reactivateConfirm")} />
                )}
                {user.role === "admin" ? (
                  <ConfirmActionForm action={setUserRoleAction} fields={{ userId: user.id, role: "user" }} label={at("user.removeAdmin")} confirmText={at("user.removeAdminConfirm")} tone="danger" />
                ) : (
                  <ConfirmActionForm action={setUserRoleAction} fields={{ userId: user.id, role: "admin" }} label={at("user.makeAdmin")} confirmText={at("user.makeAdminConfirm")} />
                )}
              </div>
            )}
          </Panel>

          <Panel at={at} title={at("user.history")} source="db">
            {history.items.length ? (
              <ul className="space-y-2">
                {history.items.map((h) => (
                  <li key={h.id} className="rounded-xl bg-surface-2/60 px-3 py-2 text-xs">
                    <span className="font-mono text-accent">{h.action}</span>
                    <span className="text-muted"> · {h.actorName ?? "system"} · {dt(h.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>{at("user.noHistory")}</EmptyNote>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
