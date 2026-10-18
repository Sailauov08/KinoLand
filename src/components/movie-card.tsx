import clsx from "clsx";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { genreName } from "@/lib/movies/genres";
import type { MovieSummary } from "@/lib/movies/types";
import { CardWatchlistButton } from "./list-buttons";
import { PosterImage } from "./poster";
import { RatingPill } from "./rating";

export function MovieCard({
  movie,
  locale,
  rank,
  priority,
  className,
}: {
  movie: MovieSummary;
  locale: Locale;
  rank?: number;
  priority?: boolean;
  className?: string;
}) {
  const genres = movie.genreIds.slice(0, 2).map((g) => genreName(g, locale)).filter(Boolean).join(" · ");
  return (
    <article className={clsx("group relative", className)}>
      <Link
        href={`/movie/${movie.id}`}
        className="block rounded-2xl focus-visible:outline-offset-4"
        aria-label={movie.year ? `${movie.title} (${movie.year})` : movie.title}
      >
        <div className="relative overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-white/6 transition duration-500 ease-[var(--ease-cinema)] group-hover:-translate-y-1 group-hover:ring-white/20 group-hover:shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9)]">
          <PosterImage
            title={movie.title}
            year={movie.year}
            path={movie.posterPath}
            priority={priority}
            className="transition duration-700 ease-[var(--ease-cinema)] group-hover:scale-[1.04]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
          {rank ? (
            <span className="absolute bottom-2 left-2 font-display text-3xl leading-none font-semibold text-white/95 [text-shadow:0_2px_16px_rgba(0,0,0,0.8)]">
              {rank}
            </span>
          ) : null}
          {movie.voteAverage !== null ? (
            <RatingPill value={movie.voteAverage} className="absolute top-2 right-2" />
          ) : null}
        </div>
        <div className="mt-2.5 px-0.5">
          <h3 className="line-clamp-1 text-sm font-semibold text-fg transition group-hover:text-accent-strong">{movie.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-subtle">
            {[movie.year, genres].filter(Boolean).join(" · ")}
          </p>
        </div>
      </Link>
      <div className="absolute top-2 left-2">
        <CardWatchlistButton movieId={movie.id} title={movie.title} />
      </div>
    </article>
  );
}

export function MovieGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {children}
    </div>
  );
}
