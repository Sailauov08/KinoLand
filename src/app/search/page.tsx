import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackEvent } from "@/components/analytics";
import { MoviesUnavailable } from "@/components/movies-unavailable";
import { FilterPanel } from "@/components/filter-panel";
import { SearchIcon } from "@/components/icons";
import { MovieCard, MovieGrid } from "@/components/movie-card";
import { Pagination } from "@/components/pagination";
import { GridSkeleton } from "@/components/rail-section";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import type { TFunction } from "@/lib/i18n/translate";
import { filtersToSearchParams, hasActiveFilters, parseFilters, SORTS, type MovieFilters } from "@/lib/movies/filters";
import { FILTER_LANGUAGES, genreOptions, languageLabel } from "@/lib/movies/genres";
import { searchMovies } from "@/lib/movies/service";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const { t } = await getT();
  const q = (await searchParams).q;
  return { title: typeof q === "string" && q ? t("search.results", { q }) : t("search.title") };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { locale, t } = await getT();
  const filters = parseFilters(await searchParams);

  return (
    <div className="container-page">
      <PageHeader title={filters.query ? t("search.results", { q: filters.query }) : t("search.discover")} eyebrow={t("search.title")} />
      <FilterPanel
        key={filters.query}
        mode="search"
        values={{
          q: filters.query,
          genres: filters.genres,
          yearFrom: filters.yearFrom,
          yearTo: filters.yearTo,
          rating: filters.ratingMin,
          lang: filters.language,
          sort: filters.sort,
        }}
        genres={genreOptions(locale).map((g) => ({ value: g.id, label: g.name }))}
        languages={FILTER_LANGUAGES.map((l) => ({ value: l, label: languageLabel(l, locale) }))}
        sorts={SORTS.map((s) => ({ value: s, label: t(`filters.sort.${s}`) }))}
      />
      <div className="mt-10">
        <Suspense key={JSON.stringify(filters)} fallback={<GridSkeleton />}>
          <Results filters={filters} locale={locale} t={t} />
        </Suspense>
      </div>
    </div>
  );
}

async function Results({ filters, locale, t }: { filters: MovieFilters; locale: Locale; t: TFunction }) {
  const res = await searchMovies(filters, locale);
  if (!res.ok) return <MoviesUnavailable reason={res.reason} t={t} />;
  const { results, totalPages, totalResults, page, mode } = res.data;
  const shownTotal = mode === "search" && hasActiveFilters(filters) ? results.length : totalResults;
  const tracker =
    filters.page === 1 && (filters.query || hasActiveFilters(filters)) ? (
      <TrackEvent
        event={{
          type: "movie_search",
          path: "/search",
          props: {
            query: filters.query || undefined,
            results: shownTotal,
            mode,
            topMovieId: results[0]?.id,
            topTitle: results[0]?.title,
            genres: filters.genres.length ? filters.genres : undefined,
          },
        }}
      />
    ) : null;

  if (!results.length) {
    return (
      <>
        {tracker}
        <EmptyState icon={<SearchIcon size={26} />} title={t("search.noResults")} text={t("search.noResultsText")} />
      </>
    );
  }

  const hrefFor = (p: number) => {
    const qs = filtersToSearchParams({ ...filters, page: p }).toString();
    return qs ? `/search?${qs}` : "/search";
  };

  return (
    <>
      {tracker}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <p aria-live="polite">{t("search.total", { n: formatNumber(shownTotal, locale) })}</p>
        {mode === "search" && hasActiveFilters(filters) ? <p className="text-xs text-subtle">{t("search.filteredNote")}</p> : null}
      </div>
      <MovieGrid>
        {results.map((m, i) => (
          <MovieCard key={m.id} movie={m} locale={locale} priority={i < 6} />
        ))}
      </MovieGrid>
      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} t={t} />
    </>
  );
}
