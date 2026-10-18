import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const { t } = await getT();
  return (
    <div className="container-page">
      <header className="pt-10 pb-6 sm:pt-14">
        <p className="eyebrow mb-3">KINO</p>
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">{t("admin.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">{t("admin.subtitle")}</p>
      </header>
      <AdminNav />
      <div className="pt-8">{children}</div>
    </div>
  );
}
