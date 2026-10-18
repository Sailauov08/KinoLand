import type { Metadata } from "next";
import { RoleForm } from "@/components/admin/role-form";
import { Badge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { listUsers } from "@/lib/db/users";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("admin.users") };
}

export default async function AdminUsersPage() {
  const me = await requireAdmin("/admin/users");
  const { locale, t } = await getT();
  const users = listUsers();

  return (
    <div className="relative overflow-x-auto rounded-3xl ring-1 ring-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface-2 text-xs tracking-wide text-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">{t("auth.name")}</th>
            <th scope="col" className="px-4 py-3 font-semibold">{t("admin.role")}</th>
            <th scope="col" className="px-4 py-3 font-semibold">{t("list.watchlist")} / {t("list.favorites")}</th>
            <th scope="col" className="px-4 py-3 font-semibold">{t("admin.joined")}</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">{t("admin.role")}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3.5">
                <p className="font-semibold">{u.name}</p>
                <p className="text-xs text-subtle">{u.email}</p>
              </td>
              <td className="px-4 py-3.5">
                <Badge tone={u.role === "admin" ? "accent" : "neutral"}>{t(u.role === "admin" ? "profile.role.admin" : "profile.role.user")}</Badge>
              </td>
              <td className="px-4 py-3.5 tabular-nums text-muted">
                {u.watchlistCount} / {u.favoriteCount}
              </td>
              <td className="px-4 py-3.5 text-xs text-muted">{formatDate(u.createdAt, locale)}</td>
              <td className="px-4 py-3.5 text-right">
                <RoleForm userId={u.id} role={u.role} isSelf={u.id === me.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
