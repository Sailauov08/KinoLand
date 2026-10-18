import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MoviesUnavailable } from "@/components/movies-unavailable";
import { ExternalIcon, FilmIcon, PlayIcon } from "@/components/icons";
import { ListButtons } from "@/components/list-buttons";
import { MovieCard } from "@/components/movie-card";
import { MovieRail } from "@/components/movie-rail";
import { BackdropImage, PosterImage } from "@/components/poster";
import { RatingPill } from "@/components/rating";
import { TrailerPlayer } from "@/components/trailer";
import { buttonClass, SectionHeader } from "@/components/ui";
import { formatNumber, formatRuntime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { genreName, languageLabel } from "@/lib/movies/genres";
import { tmdbImage } from "@/lib/movies/images";
import { getMovie } from "@/lib/movies/service";
import { movieIdSchema } from "@/lib/validation";
import type { Locale } from "@/lib/i18n/config";
import type { TFunction } from "@/lib/i18n/translate";
import type { MovieDetails, UnavailableReason } from "@/lib/movies/types";

type Loaded =
  | { kind: "ok"; movie: MovieDetails; locale: Locale; t: TFunction }
  | { kind: "unavailable"; reason: UnavailableReason; locale: Locale; t: TFunction };

async function load(params: Promise<{ id: string }>): Promise<Loaded> {
  const { id } = await params;
  const parsed = movieIdSchema.safeParse(id);
  if (!parsed.success) notFound();
  const { locale, t } = await getT();
  const res = await getMovie(parsed.data, locale);
  if (!res.ok) return { kind: "unavailable", reason: res.reason, locale, t };
  if (!res.data) notFound();
  return { kind: "ok", movie: res.data, locale, t };
}

export async function generateMetadata({ params }: PageProps<"/movie/[id]">): Promise<Metadata> {
  const loaded = await load(params);
  if (loaded.kind !== "ok") return {};
  const { movie } = loaded;
  const poster = tmdbImage(movie.posterPath, "w500");
  return {
    title: movie.year ? `${movie.title} (${movie.year})` : movie.title,
    description: movie.overview.slice(0, 200) || undefined,
    openGraph: poster ? { images: [{ url: poster }] } : undefined,
  };
}

export default async function MoviePage({ params }: PageProps<"/movie/[id]">) {
  const loaded = await load(params);
  const { locale, t } = loaded;
  if (loaded.kind !== "ok") return <MoviesUnavailable reason={loaded.reason} t={t} className="container-page pt-10" />;
  const { movie } = loaded;
  const runtime = formatRuntime(movie.runtime, t);

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: movie.directors.length > 1 ? t("movie.directors") : t("movie.director"), value: movie.directors.map((d) => d.name).join(", ") },
    { label: t("movie.year"), value: movie.year },
    { label: t("movie.runtime"), value: runtime },
    { label: t("movie.language"), value: movie.originalLanguage ? languageLabel(movie.originalLanguage, locale) : null },
    { label: t("movie.originalTitle"), value: movie.originalTitle !== movie.title ? movie.originalTitle : null },
  ].filter((f) => f.value);

  return (
    <article>
      {/* Backdrop */}
      <section className="relative -mt-16 overflow-hidden">
        <div className="absolute inset-0 h-[70svh] min-h-[460px]">
          <BackdropImage path={movie.backdropPath} fallbackPosterPath={movie.posterPath} priority className="opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/30 to-transparent" />
        </div>

        <div className="container-page relative grid gap-8 pt-28 pb-6 md:grid-cols-[minmax(0,260px)_1fr] md:gap-12 md:pt-40 lg:grid-cols-[300px_1fr]">
          <div className="mx-auto w-48 animate-fade-up sm:w-56 md:mx-0 md:w-full">
            <PosterImage
              title={movie.title}
              year={movie.year}
              path={movie.posterPath}
              sizes="(min-width: 1024px) 300px, (min-width: 768px) 260px, 224px"
              priority
              className="rounded-3xl shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
            />
          </div>

          <div className="min-w-0 animate-fade-up self-end [animation-delay:80ms]">
            <div className="flex flex-wrap gap-2">
              {movie.genreIds.map((g) => {
                const name = genreName(g, locale);
                return name ? (
                  <Link key={g} href={`/search?genre=${g}`} className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-fg/85 ring-1 ring-white/10 transition hover:bg-white/14">
                    {name}
                  </Link>
                ) : null;
              })}
            </div>
            <h1 className="mt-4 font-display text-3xl leading-tight font-medium tracking-tight text-balance sm:text-4xl lg:text-5xl">
              {movie.title}
              {movie.year ? <span className="ml-3 font-sans text-2xl font-normal text-muted sm:text-3xl">{movie.year}</span> : null}
            </h1>
            {movie.tagline ? <p className="mt-3 font-display text-base text-accent-strong italic">{movie.tagline}</p> : null}

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              {movie.voteAverage !== null ? (
                <span className="flex items-center gap-2">
                  <RatingPill value={movie.voteAverage} className="text-sm" />
                  <span className="text-xs">
                    {t("movie.rating")}
                    {movie.voteCount ? ` · ${t("movie.votes", { n: formatNumber(movie.voteCount, locale) })}` : ""}
                  </span>
                </span>
              ) : (
                <span className="text-xs text-subtle">{t("data.noRating")}</span>
              )}
              {runtime ? <span>{runtime}</span> : null}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              {movie.trailer ? (
                <a href="#trailer" className={buttonClass("primary", "lg")}>
                  <PlayIcon size={16} />
                  {t("movie.playTrailer")}
                </a>
              ) : null}
              <ListButtons movieId={movie.id} />
            </div>

          </div>
        </div>
      </section>

      <div className="container-page grid gap-12 pt-10 lg:grid-cols-[1fr_340px] lg:gap-16">
        <div className="min-w-0 space-y-14">
          <section aria-labelledby="overview">
            <SectionHeader id="overview" title={t("movie.overview")} />
            <p className="max-w-3xl text-[1.02rem] leading-relaxed text-fg/85">{movie.overview || t("movie.noOverview")}</p>
          </section>

          <section aria-labelledby="trailer-title" id="trailer" className="scroll-mt-24">
            <SectionHeader id="trailer-title" title={t("movie.trailer")} />
            {movie.trailer ? (
              <TrailerPlayer videoKey={movie.trailer.key} title={movie.title} />
            ) : (
              <div className="flex items-center gap-4 rounded-3xl bg-surface p-6 text-sm text-muted ring-1 ring-line">
                <FilmIcon className="shrink-0 text-subtle" size={28} />
                {t("movie.noTrailer")}
              </div>
            )}
          </section>

          {movie.cast.length ? (
            <section aria-labelledby="cast">
              <SectionHeader id="cast" title={t("movie.cast")} />
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {movie.cast.slice(0, 12).map((c) => {
                  const img = tmdbImage(c.profilePath, "w185");
                  return (
                    <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-surface p-2.5 ring-1 ring-line">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-surface-3">
                        {img ? (
                          <Image src={img} alt="" fill sizes="48px" className="object-cover" />
                        ) : (
                          <span className="grid size-full place-items-center font-display text-sm text-muted">{c.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        {c.character ? <p className="truncate text-xs text-subtle">{c.character}</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>

        <aside aria-label={t("movie.details")} className="lg:pt-1">
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-line lg:sticky lg:top-24">
            <h2 className="font-display text-base font-medium">{t("movie.details")}</h2>
            <dl className="mt-4 divide-y divide-line">
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="shrink-0 text-subtle">{f.label}</dt>
                  <dd className="text-right font-medium text-fg/90">{f.value}</dd>
                </div>
              ))}
            </dl>
            {movie.homepage || movie.imdbId ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {movie.homepage ? (
                  <a href={movie.homepage} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
                    {t("movie.homepage")} <ExternalIcon size={14} />
                  </a>
                ) : null}
                {movie.imdbId ? (
                  <a href={`https://www.imdb.com/title/${movie.imdbId}/`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
                    {t("movie.imdb")} <ExternalIcon size={14} />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {movie.recommendations.length ? (
        <section className="container-page mt-16">
          <SectionHeader title={t("movie.similar")} />
          <MovieRail label={t("movie.similar")}>
            {movie.recommendations.map((m) => (
              <MovieCard key={m.id} movie={m} locale={locale} />
            ))}
          </MovieRail>
        </section>
      ) : null}
    </article>
  );
}
