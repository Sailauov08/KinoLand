import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionForm } from "@/components/admin/collection-form";
import { CollectionItems } from "@/components/admin/collection-items";
import { ExternalIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getCollectionById, getCollectionItems } from "@/lib/db/collections";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("admin.editCollection") };
}

export default async function EditCollectionPage({ params }: PageProps<"/admin/collections/[id]">) {
  const { id: raw } = await params;
  await requireAdmin(`/admin/collections/${raw}`);
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const c = getCollectionById(id);
  if (!c) notFound();
  const { t } = await getT();
  const items = getCollectionItems(c.id).map((i) => i.snapshot);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-surface p-6 ring-1 ring-line sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-medium">{t("admin.editCollection")}</h2>
          <Link href={`/collections/${c.slug}`} className={buttonClass("secondary", "sm")}>
            {t("admin.view")} <ExternalIcon size={14} />
          </Link>
        </div>
        <CollectionForm
          key={c.updatedAt}
          initial={{
            id: c.id,
            slug: c.slug,
            title: c.title,
            description: c.description,
            isPublished: c.isPublished,
            isFeatured: c.isFeatured,
            position: c.position,
          }}
        />
      </section>
      <section className="rounded-3xl bg-surface p-6 ring-1 ring-line sm:p-8">
        <CollectionItems collectionId={c.id} items={items} />
      </section>
    </div>
  );
}
