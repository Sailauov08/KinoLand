import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { MoviesUnavailable } from "@/components/movies-unavailable";
import { FilmIcon } from "@/components/icons";
import { CardWatchlistButton } from "@/components/list-buttons";
import { FilterPanel } from "@/components/filter-panel";
import { PosterImage } from "@/components/poster";
import { RatingPill } from "@/components/rating";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { parseFilters, sortMovies } from "@/lib/movies/filters";
import { genreName, genreOptions, languageLabel } from "@/lib/movies/genres";
import { getTop100 } from "@/lib/movies/service";

const TOP_SORTS = ["rank", "rating", "newest", "oldest", "title"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("top.title"), description: t("top.subtitle") };
}

export default async function TopPage({ searchParams }: PageProps<"/top">) {
  const { locale, t } = await getT();
  const params = await searchParams;
  const filters = parseFilters(params);
  const sort = z.enum(TOP_SORTS).catch("rank").parse(params.sort);
  const decade = z.coerce.number().int().min(1900).max(2030).multipleOf(10).safeParse(params.decade);
  const genre = filters.genres[0] ?? null;

  const res = await getTop100(locale);
  if (!res.ok) {
    return (
      <div className="container-page">
        <PageHeader title={t("top.title")} eyebrow="KinoLand" subtitle={t("top.subtitle")} />
        <MoviesUnavailable reason={res.reason} t={t} />
      </div>
    );
  }
  const ranked = res.data.map((movie, i) => ({ movie, rank: i + 1 }));

  let filtered = ranked.filter(({ movie }) => {
    if (genre && !movie.genreIds.includes(genre)) return false;
    if (filters.language && movie.originalLanguage !== filters.language) return false;
    if (decade.success && (movie.year === null || movie.year < decade.data || movie.year > decade.data + 9)) return false;
    return true;
  });
  if (sort !== "rank") {
    const order = sortMovies(filtered.map((r) => r.movie), sort, locale).map((m) => m.id);
    filtered = order.map((id) => filtered.find((r) => r.movie.id === id)!);
  }

  const languages = [...new Set(res.data.map((m) => m.originalLanguage).filter(Boolean))]
    .map((l) => ({ value: l, label: languageLabel(l, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  const decades = [...new Set(res.data.map((m) => (m.year ? Math.floor(m.year / 10) * 10 : null)).filter((d): d is number => d !== null))]
    .sort((a, b) => b - a)
    .map((d) => ({ value: d, label: `${d}s` }));

  return (
    <div className="container-page">
      <PageHeader title={t("top.title")} eyebrow="KinoLand" subtitle={t("top.subtitle")} />
      <FilterPanel
        mode="top"
        values={{ genres: genre ? [genre] : [], decade: decade.success ? decade.data : null, lang: filters.language, sort }}
        genres={genreOptions(locale).map((g) => ({ value: g.id, label: g.name }))}
        languages={languages}
        decades={decades}
        sorts={TOP_SORTS.map((s) => ({ value: s, label: t(s === "rank" ? "filters.sort.rank" : `filters.sort.${s}`) }))}
      />

      <p className="mt-10 mb-4 text-sm text-muted" aria-live="polite">
        {t("top.showing", { shown: filtered.length, total: res.data.length })}
      </p>

      {filtered.length ? (
        <ol className="grid gap-3 md:grid-cols-2">
          {filtered.map(({ movie, rank }) => (
            <li key={movie.id} className="group relative min-w-0">
              <Link
                href={`/movie/${movie.id}`}
                className="flex items-center gap-4 rounded-2xl bg-surface p-3 pr-14 ring-1 ring-line transition duration-300 hover:bg-surface-2 hover:ring-line-strong sm:gap-5"
              >
                <span
                  aria-label={`${t("top.rank")} ${rank}`}
                  className="w-10 shrink-0 text-center font-display text-2xl font-medium text-subtle tabular-nums transition group-hover:text-accent sm:w-12 sm:text-3xl"
                >
                  {rank}
                </span>
                <PosterImage
                  title={movie.title}
                  year={movie.year}
                  path={movie.posterPath}
                  sizes="64px"
                  priority={rank <= 4 && sort === "rank"}
                  thumb
                  className="w-14 shrink-0 rounded-lg sm:w-16"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 font-semibold text-fg transition group-hover:text-accent-strong">{movie.title}</h2>
                  <p className="mt-1 line-clamp-1 text-xs text-subtle">
                    {[movie.year, ...movie.genreIds.slice(0, 2).map((g) => genreName(g, locale))].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    {movie.voteAverage !== null ? (
                      <>
                        <RatingPill value={movie.voteAverage} />
                        {movie.voteCount ? <span>{t("movie.votes", { n: formatNumber(movie.voteCount, locale) })}</span> : null}
                      </>
                    ) : (
                      <span className="text-subtle">{t("data.noRating")}</span>
                    )}
                  </div>
                </div>
              </Link>
              <div className="absolute top-1/2 right-3 -translate-y-1/2 [&_button]:opacity-100">
                <CardWatchlistButton movieId={movie.id} title={movie.title} />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState icon={<FilmIcon size={26} />} title={t("search.noResults")} text={t("search.noResultsText")} />
      )}
    </div>
  );
}
