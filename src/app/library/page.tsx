import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { BookmarkIcon, HeartIcon } from "@/components/icons";
import { MovieCard, MovieGrid } from "@/components/movie-card";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getList, type ListName } from "@/lib/db/lists";
import { getT } from "@/lib/i18n/server";
import { getMovieSummaries } from "@/lib/movies/service";
import { fromSnapshot } from "@/lib/movies/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("library.title"), robots: { index: false } };
}

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const tab: ListName = (await searchParams).tab === "favorites" ? "favorite" : "watchlist";
  const user = await requireUser(tab === "favorite" ? "/library?tab=favorites" : "/library");
  const { locale, t } = await getT();

  const watchCount = getList(user.id, "watchlist").length;
  const favCount = getList(user.id, "favorite").length;
  const items = getList(user.id, tab);

  // Refresh titles in the current UI language; stored snapshots are the fallback.
  const fresh = await getMovieSummaries(items.map((i) => i.movieId), locale);
  const movies = items.map((i) => {
    const live = fresh.data.get(i.movieId);
    return live ? { ...live, posterPath: live.posterPath ?? i.snapshot.posterPath } : fromSnapshot(i.snapshot);
  });

  const tabs = [
    { key: "watchlist" as const, href: "/library", label: t("list.watchlist"), count: watchCount, icon: <BookmarkIcon size={16} /> },
    { key: "favorite" as const, href: "/library?tab=favorites", label: t("list.favorites"), count: favCount, icon: <HeartIcon size={16} /> },
  ];

  return (
    <div className="container-page">
      <PageHeader title={t("library.title")} eyebrow={user.name} />
      <nav aria-label={t("library.title")} className="mb-8 flex gap-2 border-b border-line">
        {tabs.map((tb) => (
          <Link
            key={tb.key}
            href={tb.href}
            aria-current={tab === tb.key ? "page" : undefined}
            className={clsx(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-semibold transition",
              tab === tb.key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {tb.icon}
            {tb.label}
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs tabular-nums">{tb.count}</span>
          </Link>
        ))}
      </nav>

      {movies.length ? (
        <MovieGrid>
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} locale={locale} t={t} demo={fresh.source === "demo"} />
          ))}
        </MovieGrid>
      ) : (
        <EmptyState
          icon={tab === "watchlist" ? <BookmarkIcon size={26} /> : <HeartIcon size={26} />}
          title={tab === "watchlist" ? t("list.emptyWatchlist") : t("list.emptyFavorites")}
          text={tab === "watchlist" ? t("list.emptyWatchlistText") : t("list.emptyFavoritesText")}
          action={<LinkButton href="/top">{t("list.browse")}</LinkButton>}
        />
      )}
    </div>
  );
}
