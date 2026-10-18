import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { AdminPageHeader, StatusPill, tableCls } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { listUsersPaged, USER_SORTS } from "@/lib/db/users";
import { localeTags } from "@/lib/i18n/config";
import { getAdminT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { at } = await getAdminT();
  return { title: at("users.title") };
}

const paramsSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  role: z.enum(["user", "admin"]).nullable().catch(null),
  status: z.enum(["active", "suspended"]).nullable().catch(null),
  sort: z.enum(USER_SORTS).catch("newest"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin("/admin/users");
  const { at, locale } = await getAdminT();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const f = paramsSchema.parse({ q: one(sp.q) ?? "", role: one(sp.role) ?? null, status: one(sp.status) ?? null, sort: one(sp.sort), page: one(sp.page) });
  const res = await listUsersPaged({ query: f.q, role: f.role, status: f.status, sort: f.sort, page: f.page, perPage: 20 });
  const tag = localeTags[locale];
  const date = (ts: number | null) => (ts ? new Date(ts).toLocaleDateString(tag, { dateStyle: "medium" }) : at("users.never"));
  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (f.q) qs.set("q", f.q);
    if (f.role) qs.set("role", f.role);
    if (f.status) qs.set("status", f.status);
    if (f.sort !== "newest") qs.set("sort", f.sort);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/admin/users?${s}` : "/admin/users";
  };

  return (
    <>
      <AdminPageHeader title={at("users.title")} subtitle={at("users.subtitle")} />

      <form method="get" role="search" className="mb-5 grid gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-[1fr_150px_160px_180px_auto]">
        <input name="q" defaultValue={f.q} placeholder={at("users.search")} aria-label={at("users.search")} className="field" maxLength={100} />
        <select name="role" defaultValue={f.role ?? ""} aria-label={at("users.col.role")} className="field">
          <option value="">{at("users.allRoles")}</option>
          <option value="admin">{at("users.role.admin")}</option>
          <option value="user">{at("users.role.user")}</option>
        </select>
        <select name="status" defaultValue={f.status ?? ""} aria-label={at("users.col.status")} className="field">
          <option value="">{at("users.allStatuses")}</option>
          <option value="active">{at("users.status.active")}</option>
          <option value="suspended">{at("users.status.suspended")}</option>
        </select>
        <select name="sort" defaultValue={f.sort} aria-label="Sort" className="field">
          {USER_SORTS.map((s) => (
            <option key={s} value={s}>
              {at(`users.sort.${s}`)}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button type="submit" className={buttonClass("primary", "md", "flex-1")}>
            {at("users.apply")}
          </button>
          <Link href="/admin/users" className={buttonClass("ghost", "md")}>
            {at("users.reset")}
          </Link>
        </div>
      </form>

      <p className="mb-3 text-sm text-muted" aria-live="polite">
        {at("users.count", { n: res.total.toLocaleString(tag) })}
      </p>

      <div className={tableCls.wrap}>
        <table className={clsx(tableCls.table, "min-w-[860px]")}>
          <thead className={tableCls.thead}>
            <tr>
              <th scope="col" className={tableCls.th}>{at("users.col.user")}</th>
              <th scope="col" className={tableCls.th}>{at("users.col.role")}</th>
              <th scope="col" className={tableCls.th}>{at("users.col.status")}</th>
              <th scope="col" className={tableCls.th}>{at("users.col.joined")}</th>
              <th scope="col" className={tableCls.th}>{at("users.col.lastSeen")}</th>
              <th scope="col" className={tableCls.th}>{at("users.col.lists")}</th>
              <th scope="col" className={tableCls.th}><span className="sr-only">{at("users.view")}</span></th>
            </tr>
          </thead>
          <tbody className={tableCls.tbody}>
            {res.items.length ? (
              res.items.map((u) => (
                <tr key={u.id} className="transition hover:bg-surface-2/50">
                  <td className={tableCls.td}>
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 font-display text-sm text-muted">{u.name.charAt(0).toUpperCase()}</span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {u.name} {u.id === me.id ? <span className="ml-1 rounded bg-accent/15 px-1.5 py-0.5 text-[0.62rem] font-bold text-accent">{at("users.you")}</span> : null}
                        </p>
                        <p className="truncate text-xs text-subtle">{u.email}</p>
                        <p className="truncate font-mono text-[0.65rem] text-subtle/70">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className={tableCls.td}>
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", u.role === "admin" ? "bg-accent/15 text-accent" : "bg-white/6 text-muted")}>{at(`users.role.${u.role}`)}</span>
                  </td>
                  <td className={tableCls.td}>
                    <StatusPill ok={u.status === "active"} label={at(`users.status.${u.status}`)} />
                  </td>
                  <td className={clsx(tableCls.td, "text-xs text-muted tabular-nums")}>{date(u.createdAt)}</td>
                  <td className={clsx(tableCls.td, "text-xs text-muted tabular-nums")}>{date(u.lastSeenAt)}</td>
                  <td className={clsx(tableCls.td, "text-xs text-muted tabular-nums")}>
                    {u.watchlistCount} / {u.favoriteCount}
                  </td>
                  <td className={clsx(tableCls.td, "text-right")}>
                    <Link href={`/admin/users/${u.id}`} className="text-sm font-semibold text-accent hover:text-accent-strong">
                      {at("users.view")}
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-subtle">
                  {at("users.none")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {res.totalPages > 1 ? (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
          <Link href={pageHref(res.page - 1)} aria-disabled={res.page <= 1} className={clsx(buttonClass("secondary", "sm"), res.page <= 1 && "pointer-events-none opacity-40")}>
            {at("users.prev")}
          </Link>
          <span className="text-xs text-muted tabular-nums">{at("users.page", { page: res.page, total: res.totalPages })}</span>
          <Link href={pageHref(res.page + 1)} aria-disabled={res.page >= res.totalPages} className={clsx(buttonClass("secondary", "sm"), res.page >= res.totalPages && "pointer-events-none opacity-40")}>
            {at("users.next")}
          </Link>
        </nav>
      ) : null}
    </>
  );
}
