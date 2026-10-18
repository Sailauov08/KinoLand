import Link from "next/link";
import { Suspense } from "react";
import { DataNotice } from "@/components/data-notice";
import { Hero } from "@/components/hero";
import { SparklesIcon } from "@/components/icons";
import { RailSection, RailSkeleton } from "@/components/rail-section";
import { buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { getCollectionItems, listCollections, localized, type Collection } from "@/lib/db/collections";
import { getList } from "@/lib/db/lists";
import { getSpotlight } from "@/lib/db/settings";
import type { User } from "@/lib/db/users";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import type { TFunction } from "@/lib/i18n/translate";
import { genreName } from "@/lib/movies/genres";
import { getByGenre, getMovie, getMovieSummaries, getNowPlaying, getTopRatedRail, getTrending, getUpcoming } from "@/lib/movies/service";
import { fromSnapshot } from "@/lib/movies/types";
import { getRecommendationsFor } from "@/lib/recommendations";

type Ctx = { locale: Locale; t: TFunction };

export default async function HomePage() {
  const [{ locale, t }, user] = await Promise.all([getT(), getCurrentUser()]);
  const ctx = { locale, t };
  const featured = listCollections({ publishedOnly: true, featuredOnly: true });
  const moodGenres = user?.preferredGenres.length ? user.preferredGenres.slice(0, 2) : [878, 16];

  return (
    <>
      <Suspense fallback={<div className="-mt-16 min-h-[78svh] bg-surface sm:min-h-[86svh]" aria-hidden />}>
        <HomeHero {...ctx} />
      </Suspense>

      {user ? (
        <Suspense fallback={<RailSkeleton />}>
          <ForYouRail user={user} {...ctx} />
        </Suspense>
      ) : null}

      <Suspense fallback={<RailSkeleton />}>
        <TrendingRail {...ctx} />
      </Suspense>

      {user ? <WatchlistRail user={user} {...ctx} /> : null}

      {featured.map((c) => (
        <Suspense key={c.id} fallback={<RailSkeleton />}>
          <CollectionRail collection={c} {...ctx} />
        </Suspense>
      ))}

      <Suspense fallback={<RailSkeleton />}>
        <TopRatedRail {...ctx} />
      </Suspense>

      {!user ? <PersonalizeCta t={t} /> : null}

      <Suspense fallback={<RailSkeleton />}>
        <NowPlayingRail {...ctx} />
      </Suspense>

      {moodGenres.map((g) => (
        <Suspense key={g} fallback={<RailSkeleton />}>
          <GenreRail genre={g} {...ctx} />
        </Suspense>
      ))}

      <Suspense fallback={<RailSkeleton />}>
        <UpcomingRail {...ctx} />
      </Suspense>
    </>
  );
}

async function HomeHero({ locale, t }: Ctx) {
  const spotlight = getSpotlight();
  let movieId = spotlight?.movieId;
  let notice;
  if (!movieId) {
    const trending = await getTrending(locale);
    notice = trending.notice;
    movieId = trending.data[0]?.id;
  }
  const res = movieId ? await getMovie(movieId, locale) : null;
  const movie = res?.data;
  if (!movie) return <div className="h-8" />;
  return (
    <>
      <Hero
        movie={movie}
        locale={locale}
        t={t}
        eyebrow={spotlight ? t("home.editorsPick") : t("home.featured")}
        tagline={spotlight ? spotlight.tagline[locale] || spotlight.tagline.en || undefined : undefined}
      />
      <div className="container-page">
        <DataNotice notice={notice ?? res?.notice} t={t} inline />
      </div>
    </>
  );
}

async function CollectionRail({ collection: c, ...ctx }: Ctx & { collection: Collection }) {
  const items = getCollectionItems(c.id);
  // Localize titles for the current UI language; stored snapshots are the fallback.
  const fresh = await getMovieSummaries(items.map((i) => i.movieId), ctx.locale);
  return (
    <RailSection
      title={localized(c.title, ctx.locale)}
      eyebrow={ctx.t("home.editorsPick")}
      movies={items.map((i) => fresh.data.get(i.movieId) ?? fromSnapshot(i.snapshot))}
      demo={fresh.source === "demo"}
      href={`/collections/${c.slug}`}
      {...ctx}
    />
  );
}

async function TrendingRail(ctx: Ctx) {
  const res = await getTrending(ctx.locale);
  return <RailSection title={ctx.t("home.trending")} movies={res.data} demo={res.source === "demo"} href="/search" {...ctx} />;
}

async function TopRatedRail(ctx: Ctx) {
  const res = await getTopRatedRail(ctx.locale);
  return <RailSection title={ctx.t("home.topRated")} movies={res.data} demo={res.source === "demo"} href="/top" ranked {...ctx} />;
}

async function NowPlayingRail(ctx: Ctx) {
  const res = await getNowPlaying(ctx.locale);
  return <RailSection title={ctx.t("home.nowPlaying")} movies={res.data} demo={res.source === "demo"} {...ctx} />;
}

async function UpcomingRail(ctx: Ctx) {
  const res = await getUpcoming(ctx.locale);
  return <RailSection title={ctx.t("home.upcoming")} movies={res.data} demo={res.source === "demo"} {...ctx} />;
}

async function GenreRail({ genre, ...ctx }: Ctx & { genre: number }) {
  const res = await getByGenre(genre, ctx.locale);
  const name = genreName(genre, ctx.locale) ?? "";
  return (
    <RailSection
      title={ctx.t("home.byGenre", { genre: name })}
      movies={res.data}
      demo={res.source === "demo"}
      href={`/search?genre=${genre}`}
      {...ctx}
    />
  );
}

async function ForYouRail({ user, ...ctx }: Ctx & { user: User }) {
  const rec = await getRecommendationsFor(user, ctx.locale, 18);
  if (!rec.items.length) return null;
  return (
    <RailSection
      title={ctx.t("home.forYou")}
      eyebrow={ctx.t("home.forYouHint")}
      movies={rec.items.map((r) => r.movie)}
      demo={rec.source === "demo"}
      href="/for-you"
      {...ctx}
    />
  );
}

function WatchlistRail({ user, ...ctx }: Ctx & { user: User }) {
  const items = getList(user.id, "watchlist");
  return (
    <RailSection
      title={ctx.t("home.continueWatchlist")}
      movies={items.slice(0, 20).map((i) => fromSnapshot(i.snapshot))}
      href="/library"
      {...ctx}
    />
  );
}

function PersonalizeCta({ t }: { t: TFunction }) {
  return (
    <section className="container-page mt-16">
      <div className="relative overflow-hidden rounded-[2rem] bg-surface px-6 py-10 ring-1 ring-line sm:px-12 sm:py-14">
        <div
          aria-hidden
          className="absolute -top-24 -right-16 size-80 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(232,180,76,0.55), transparent 65%)" }}
        />
        <div className="relative max-w-xl">
          <SparklesIcon className="text-accent" size={26} />
          <h2 className="mt-4 font-display text-2xl font-medium tracking-tight sm:text-3xl">{t("home.personalizeTitle")}</h2>
          <p className="mt-3 text-muted">{t("home.personalizeText")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/register" className={buttonClass("primary", "lg")}>
              {t("nav.signUp")}
            </Link>
            <Link href="/login" className={buttonClass("secondary", "lg")}>
              {t("nav.signIn")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
