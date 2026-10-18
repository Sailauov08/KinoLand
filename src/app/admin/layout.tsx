import type { Metadata } from "next";
import { AdminI18nProvider } from "@/components/admin/admin-i18n";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · KinoLand Admin" }, robots: { index: false, follow: false } };

/** Every admin route is gated server-side by a database role check (see also each page and action). */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  const { adminDict } = await getAdminT();
  return (
    <AdminI18nProvider dict={adminDict}>
      <AdminShell userName={user.name}>{children}</AdminShell>
    </AdminI18nProvider>
  );
}
