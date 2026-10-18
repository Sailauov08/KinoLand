import type { Metadata } from "next";
import { CollectionForm } from "@/components/admin/collection-form";
import { requireAdmin } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("admin.newCollection") };
}

export default async function NewCollectionPage() {
  await requireAdmin("/admin/collections/new");
  const { t } = await getT();
  return (
    <section className="rounded-3xl bg-surface p-6 ring-1 ring-line sm:p-8">
      <h2 className="mb-6 font-display text-lg font-medium">{t("admin.newCollection")}</h2>
      <CollectionForm />
    </section>
  );
}
