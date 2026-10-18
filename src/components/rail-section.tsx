import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { TFunction } from "@/lib/i18n/translate";
import type { MovieSummary } from "@/lib/movies/types";
import { ChevronRightIcon } from "./icons";
import { MovieCard } from "./movie-card";
import { MovieRail } from "./movie-rail";
import { SectionHeader } from "./ui";

export function RailSection({
  title,
  eyebrow,
  movies,
  locale,
  t,
  href,
  ranked,
}: {
  title: string;
  eyebrow?: string;
  movies: MovieSummary[];
  locale: Locale;
  t: TFunction;
  href?: string;
  ranked?: boolean;
}) {
  if (!movies.length) return null;
  return (
    <section className="container-page mt-12 sm:mt-14">
      <SectionHeader
        title={title}
        eyebrow={eyebrow}
        action={
          href ? (
            <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-muted transition hover:text-accent">
              {t("home.seeAll")}
              <ChevronRightIcon size={16} className="transition group-hover:translate-x-0.5" />
            </Link>
          ) : null
        }
      />
      <MovieRail label={title}>
        {movies.map((m, i) => (
          <MovieCard key={m.id} movie={m} locale={locale} rank={ranked ? i + 1 : undefined} />
        ))}
      </MovieRail>
    </section>
  );
}

export function RailSkeleton() {
  return (
    <div className="container-page mt-12 sm:mt-14" aria-hidden>
      <div className="skeleton mb-5 h-6 w-48 rounded-full" />
      <div className="flex gap-3 overflow-hidden sm:gap-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="w-[38vw] shrink-0 sm:w-[180px] lg:w-[196px] xl:w-[210px]">
            <div className="skeleton aspect-[2/3] rounded-2xl" />
            <div className="skeleton mt-3 h-3.5 w-3/4 rounded-full" />
            <div className="skeleton mt-2 h-3 w-1/2 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="skeleton aspect-[2/3] rounded-2xl" />
          <div className="skeleton mt-3 h-3.5 w-3/4 rounded-full" />
          <div className="skeleton mt-2 h-3 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}
