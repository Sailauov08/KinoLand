import type { Metadata } from "next";
import Link from "next/link";
import { SpotlightForm } from "@/components/admin/spotlight-form";
import { PlusIcon } from "@/components/icons";
import { Badge, EmptyState, LinkButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { listCollections, localized } from "@/lib/db/collections";
import { getSpotlight } from "@/lib/db/settings";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { getMovie } from "@/lib/movies/service";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("admin.title") };
}

export default async function AdminPage() {
  await requireAdmin();
  const { locale, t } = await getT();
  const collections = listCollections();
  const spotlight = getSpotlight();
  const spotlightMovie = spotlight ? (await getMovie(spotlight.movieId, locale)).data : null;

  return (
    <div className="grid gap-10 xl:grid-cols-[1fr_400px]">
      <section aria-labelledby="collections-heading" className="min-w-0">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="collections-heading" className="font-display text-lg font-medium">{t("admin.collections")}</h2>
          <LinkButton href="/admin/collections/new" size="sm">
            <PlusIcon size={16} /> {t("admin.newCollection")}
          </LinkButton>
        </div>
        {collections.length ? (
          <div className="relative overflow-x-auto rounded-3xl ring-1 ring-line">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-surface-2 text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("admin.titleField", { lang: "EN" })}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("admin.items")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("admin.published")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("admin.updated")}</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">{t("admin.edit")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {collections.map((c) => (
                  <tr key={c.id} className="transition hover:bg-surface-2/60">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold">{localized(c.title, locale)}</p>
                      <p className="text-xs text-subtle">/{c.slug}</p>
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">{c.itemCount}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={c.isPublished ? "success" : "neutral"}>{c.isPublished ? t("admin.live") : t("admin.draft")}</Badge>
                        {c.isFeatured ? <Badge tone="accent">{t("home.featured")}</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted">{formatDate(c.updatedAt, locale)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/admin/collections/${c.id}`} className="font-semibold text-accent hover:text-accent-strong">
                        {t("admin.edit")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={t("admin.empty")}
            action={
              <LinkButton href="/admin/collections/new">
                <PlusIcon size={16} /> {t("admin.newCollection")}
              </LinkButton>
            }
          />
        )}
      </section>

      <section aria-labelledby="spotlight-heading" className="min-w-0 h-fit rounded-3xl bg-surface p-6 ring-1 ring-line">
        <h2 id="spotlight-heading" className="font-display text-lg font-medium">{t("admin.spotlight")}</h2>
        <p className="mt-1 mb-5 text-sm text-muted">{t("admin.spotlightHint")}</p>
        <p className="mb-5 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
          {spotlightMovie ? t("admin.spotlightCurrent", { title: `${spotlightMovie.title} (#${spotlightMovie.id})` }) : t("admin.spotlightNone")}
        </p>
        <SpotlightForm current={spotlight} />
      </section>
    </div>
  );
}
