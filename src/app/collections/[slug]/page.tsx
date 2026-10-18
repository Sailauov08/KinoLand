import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilmIcon } from "@/components/icons";
import { MovieCard, MovieGrid } from "@/components/movie-card";
import { EmptyState, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { getCollectionBySlug, getCollectionItems, localized } from "@/lib/db/collections";
import { getT } from "@/lib/i18n/server";
import { getMovieSummaries } from "@/lib/movies/service";
import { fromSnapshot } from "@/lib/movies/types";

async function load(slug: string) {
  const c = getCollectionBySlug(slug);
  if (!c) notFound();
  if (!c.isPublished) {
    // Drafts are previewable by admins only.
    const user = await getCurrentUser();
    if (user?.role !== "admin") notFound();
  }
  return c;
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const c = await load((await params).slug);
  const { locale } = await getT();
  return { title: localized(c.title, locale), description: localized(c.description, locale) || undefined };
}

export default async function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  const c = await load((await params).slug);
  const { locale, t } = await getT();
  const items = getCollectionItems(c.id);
  const fresh = await getMovieSummaries(items.map((i) => i.movieId), locale);
  const movies = items.map((i) => fresh.data.get(i.movieId) ?? fromSnapshot(i.snapshot));

  return (
    <div className="container-page">
      <PageHeader
        title={localized(c.title, locale)}
        eyebrow={`${t("home.editorsPick")} · ${t("collections.films", { n: items.length })}`}
        subtitle={localized(c.description, locale) || undefined}
      />
      {movies.length ? (
        <MovieGrid>
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} locale={locale} t={t} demo={fresh.source === "demo"} />
          ))}
        </MovieGrid>
      ) : (
        <EmptyState icon={<FilmIcon size={26} />} title={t("collections.emptyItems")} />
      )}
    </div>
  );
}
