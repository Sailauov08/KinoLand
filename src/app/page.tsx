import Link from "next/link";
import { Suspense } from "react";
import { MoviesUnavailable } from "@/components/movies-unavailable";
import { Hero } from "@/components/hero";
import { SparklesIcon } from "@/components/icons";
import { RailSection, RailSkeleton } from "@/components/rail-section";
import { buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { bannerOfTheDay, localized } from "@/lib/db/content";
import { getList, refreshListSnapshots } from "@/lib/db/lists";
import { getDisplaySettings } from "@/lib/db/settings";
import type { User } from "@/lib/db/users";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import type { TFunction } from "@/lib/i18n/translate";
import { genreName } from "@/lib/movies/genres";
import { getByGenre, getMovie, getNowPlaying, getTopRatedRail, getTrending, getUpcoming } from "@/lib/movies/service";
import { withFreshData } from "@/lib/movies/fresh";
import { getRecommendationsFor } from "@/lib/recommendations";

type Ctx = { locale: Locale; t: TFunction };

export default async function HomePage() {
  const [{ locale, t }, user] = await Promise.all([getT(), getCurrentUser()]);
  const ctx = { locale, t };
  const display = getDisplaySettings();
  const moodGenres = user?.preferredGenres.length ? user.preferredGenres.slice(0, 2) : [878, 16];

  return (
    <>
      <Suspense fallback={<div className="-mt-16 min-h-[78svh] bg-surface sm:min-h-[86svh]" aria-hidden />}>
        <HomeHero {...ctx} />
      </Suspense>

      {user && display.showPersonalized ? (
        <Suspense fallback={<RailSkeleton />}>
          <ForYouRail user={user} {...ctx} />
        </Suspense>
      ) : null}

      {display.showTrending ? (
        <Suspense fallback={<RailSkeleton />}>
          <TrendingRail {...ctx} />
        </Suspense>
      ) : null}

      {user ? (
        <Suspense fallback={<RailSkeleton />}>
          <WatchlistRail user={user} {...ctx} />
        </Suspense>
      ) : null}

      {display.showTopRated ? (
        <Suspense fallback={<RailSkeleton />}>
          <TopRatedRail {...ctx} />
        </Suspense>
      ) : null}

      {!user ? <PersonalizeCta t={t} /> : null}

      {display.showNowPlaying ? (
        <Suspense fallback={<RailSkeleton />}>
          <NowPlayingRail {...ctx} />
        </Suspense>
      ) : null}

      {display.showGenreMoods
        ? moodGenres.map((g) => (
            <Suspense key={g} fallback={<RailSkeleton />}>
              <GenreRail genre={g} {...ctx} />
            </Suspense>
          ))
        : null}

      {display.showUpcoming ? (
        <Suspense fallback={<RailSkeleton />}>
          <UpcomingRail {...ctx} />
        </Suspense>
      ) : null}
    </>
  );
}

/** Admin-curated banner of the day (active banners rotate daily), else the week's top trending film. */
async function HomeHero({ locale, t }: Ctx) {
  const banner = bannerOfTheDay();
  let movieId = banner?.movieId;
  if (!movieId) {
    const trending = await getTrending(locale);
    if (!trending.ok) return <MoviesUnavailable reason={trending.reason} t={t} className="container-page pt-10" />;
    movieId = trending.data[0]?.id;
  }
  let res = movieId ? await getMovie(movieId, locale) : null;
  // A banner pointing at a hidden/removed film falls back to trending rather than an empty hero.
  if (banner && res?.ok && !res.data) {
    const trending = await getTrending(locale);
    res = trending.ok && trending.data[0] ? await getMovie(trending.data[0].id, locale) : res;
  }
  if (res && !res.ok) return <MoviesUnavailable reason={res.reason} t={t} className="container-page pt-10" />;
  const movie = res?.data;
  if (!movie) return <div className="h-8" />;
  const isBanner = banner?.movieId === movie.id;
  return (
    <Hero
      movie={movie}
      locale={locale}
      t={t}
      eyebrow={isBanner ? localized(banner.headline, locale) || t("home.editorsPick") : t("home.featured")}
      tagline={isBanner ? localized(banner.description, locale) || undefined : undefined}
    />
  );
}

async function TrendingRail(ctx: Ctx) {
  const res = await getTrending(ctx.locale);
  return res.ok ? <RailSection title={ctx.t("home.trending")} movies={res.data} href="/search" {...ctx} /> : null;
}

async function TopRatedRail(ctx: Ctx) {
  const res = await getTopRatedRail(ctx.locale);
  return res.ok ? <RailSection title={ctx.t("home.topRated")} movies={res.data} href="/top" ranked {...ctx} /> : null;
}

async function NowPlayingRail(ctx: Ctx) {
  const res = await getNowPlaying(ctx.locale);
  return res.ok ? <RailSection title={ctx.t("home.nowPlaying")} movies={res.data} {...ctx} /> : null;
}

async function UpcomingRail(ctx: Ctx) {
  const res = await getUpcoming(ctx.locale);
  return res.ok ? <RailSection title={ctx.t("home.upcoming")} movies={res.data} {...ctx} /> : null;
}

async function GenreRail({ genre, ...ctx }: Ctx & { genre: number }) {
  const res = await getByGenre(genre, ctx.locale);
  if (!res.ok) return null;
  return (
    <RailSection
      title={ctx.t("home.byGenre", { genre: genreName(genre, ctx.locale) ?? "" })}
      movies={res.data}
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
      href="/for-you"
      {...ctx}
    />
  );
}

async function WatchlistRail({ user, ...ctx }: Ctx & { user: User }) {
  const items = getList(user.id, "watchlist").slice(0, 20);
  const movies = await withFreshData(items.map((i) => i.snapshot), ctx.locale, (fresh) => refreshListSnapshots(user.id, fresh));
  return <RailSection title={ctx.t("home.continueWatchlist")} movies={movies} href="/library" {...ctx} />;
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
