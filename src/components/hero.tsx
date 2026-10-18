import Link from "next/link";
import { formatRuntime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { TFunction } from "@/lib/i18n/translate";
import { genreName } from "@/lib/movies/genres";
import type { MovieDetails, MovieSummary } from "@/lib/movies/types";
import { InfoIcon, PlayIcon } from "./icons";
import { ListButtons } from "./list-buttons";
import { BackdropImage } from "./poster";
import { RatingPill } from "./rating";
import { buttonClass } from "./ui";

export function Hero({
  movie,
  eyebrow,
  tagline,
  locale,
  t,
}: {
  movie: MovieSummary | MovieDetails;
  eyebrow: string;
  tagline?: string;
  locale: Locale;
  t: TFunction;
}) {
  const details = "runtime" in movie ? movie : null;
  const meta = [
    movie.year,
    details ? formatRuntime(details.runtime, t) : null,
    ...movie.genreIds.slice(0, 3).map((g) => genreName(g, locale)),
  ].filter(Boolean);

  return (
    <section aria-labelledby="hero-title" className="relative -mt-16 flex min-h-[78svh] items-end overflow-hidden sm:min-h-[86svh]">
      <div className="absolute inset-0">
        <BackdropImage path={movie.backdropPath} fallbackPosterPath={movie.posterPath} priority className="animate-[fade-up_1.2s_var(--ease-cinema)_both]" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-black/30" />
      </div>
      <div className="container-page relative pt-32 pb-14 sm:pb-20">
        <div className="max-w-2xl animate-fade-up">
          <p className="eyebrow mb-4 flex items-center gap-2">
            <span className="inline-block h-px w-8 bg-accent" />
            {eyebrow}
          </p>
          <h1 id="hero-title" className="font-display text-4xl leading-[1.05] font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {movie.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            {movie.voteAverage !== null ? <RatingPill value={movie.voteAverage} /> : null}
            {meta.map((m, i) => (
              <span key={i} className="flex items-center gap-3">
                {i > 0 ? <span aria-hidden className="size-1 rounded-full bg-white/30" /> : null}
                {m}
              </span>
            ))}
          </div>
          {tagline ? <p className="mt-5 font-display text-base text-accent-strong italic sm:text-lg">“{tagline}”</p> : null}
          {movie.overview ? (
            <p className="mt-4 line-clamp-3 max-w-xl text-[0.95rem] leading-relaxed text-fg/80 sm:text-base">{movie.overview}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <Link href={`/movie/${movie.id}`} className={buttonClass("primary", "lg")}>
              <InfoIcon size={18} />
              {t("home.heroCta")}
            </Link>
            {details?.trailer ? (
              <Link href={`/movie/${movie.id}#trailer`} className={buttonClass("secondary", "lg")}>
                <PlayIcon size={16} />
                {t("home.heroTrailer")}
              </Link>
            ) : null}
            <ListButtons movieId={movie.id} />
          </div>
        </div>
      </div>
    </section>
  );
}
