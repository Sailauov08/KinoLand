import type { Metadata } from "next";
import Link from "next/link";
import { FilmIcon } from "@/components/icons";
import { PosterImage } from "@/components/poster";
import { EmptyState, PageHeader } from "@/components/ui";
import { getCollectionItems, listCollections, localized } from "@/lib/db/collections";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("collections.title"), description: t("collections.subtitle") };
}

export default async function CollectionsPage() {
  const { locale, t } = await getT();
  const collections = listCollections({ publishedOnly: true });

  return (
    <div className="container-page">
      <PageHeader title={t("collections.title")} eyebrow="KINO" subtitle={t("collections.subtitle")} />
      {collections.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((c, ci) => {
            const posters = getCollectionItems(c.id).slice(0, 4);
            return (
              <li key={c.id}>
                <Link
                  href={`/collections/${c.slug}`}
                  className="group block overflow-hidden rounded-3xl bg-surface ring-1 ring-line transition duration-500 hover:-translate-y-1 hover:ring-line-strong"
                >
                  <div className="relative grid h-52 grid-cols-4 gap-1 overflow-hidden bg-surface-2 p-1">
                    {posters.length ? (
                      posters.map((p) => (
                        <PosterImage
                          key={p.movieId}
                          title={p.snapshot.title}
                          year={p.snapshot.year}
                          path={p.snapshot.posterPath}
                          sizes="120px"
                          priority={ci < 3}
                          className="h-full rounded-xl transition duration-700 group-hover:scale-[1.03]"
                        />
                      ))
                    ) : (
                      <div className="col-span-4 grid place-items-center text-subtle">
                        <FilmIcon size={32} />
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                  </div>
                  <div className="p-5 pt-3">
                    <p className="eyebrow">{t("collections.films", { n: c.itemCount })}</p>
                    <h2 className="mt-2 font-display text-lg font-medium transition group-hover:text-accent-strong">{localized(c.title, locale)}</h2>
                    {localized(c.description, locale) ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted">{localized(c.description, locale)}</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<FilmIcon size={26} />} title={t("collections.empty")} />
      )}
    </div>
  );
}
