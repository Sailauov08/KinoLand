import type { Metadata } from "next";
import { Suspense } from "react";
import { MoviesUnavailable } from "@/components/movies-unavailable";
import { SparklesIcon } from "@/components/icons";
import { MovieCard, MovieGrid } from "@/components/movie-card";
import { GridSkeleton } from "@/components/rail-section";
import { Badge, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import type { User } from "@/lib/db/users";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import type { TFunction } from "@/lib/i18n/translate";
import { genreName } from "@/lib/movies/genres";
import { getRecommendationsFor } from "@/lib/recommendations";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("forYou.title") };
}

export default async function ForYouPage() {
  const [{ locale, t }, user] = await Promise.all([getT(), getCurrentUser()]);
  return (
    <div className="container-page">
      <PageHeader title={t("forYou.title")} eyebrow="KinoLand" subtitle={t("forYou.subtitle")} />
      {user ? (
        <Suspense fallback={<GridSkeleton />}>
          <Recommendations user={user} locale={locale} t={t} />
        </Suspense>
      ) : (
        <EmptyState
          icon={<SparklesIcon size={26} />}
          title={t("forYou.signedOut")}
          text={t("forYou.signedOutText")}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <LinkButton href="/register?next=/profile">{t("nav.signUp")}</LinkButton>
              <LinkButton href="/login?next=/for-you" variant="secondary">
                {t("nav.signIn")}
              </LinkButton>
            </div>
          }
        />
      )}
    </div>
  );
}

async function Recommendations({ user, locale, t }: { user: User; locale: Locale; t: TFunction }) {
  const rec = await getRecommendationsFor(user, locale, 30);
  if (rec.unavailable) return <MoviesUnavailable reason={rec.unavailable} t={t} />;
  if (!rec.hasTaste || !rec.items.length) {
    return (
      <EmptyState
        icon={<SparklesIcon size={26} />}
        title={t("forYou.noTaste")}
        text={t("forYou.noTasteText")}
        action={<LinkButton href="/profile#genres">{t("forYou.chooseGenres")}</LinkButton>}
      />
    );
  }
  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-muted">{t("forYou.basedOn")}:</span>
        {rec.genres.map((g) => (
          <Badge key={g} tone="accent">
            {genreName(g, locale)}
          </Badge>
        ))}
      </div>
      <MovieGrid>
        {rec.items.map(({ movie }, i) => (
          <MovieCard key={movie.id} movie={movie} locale={locale} priority={i < 6} />
        ))}
      </MovieGrid>
    </>
  );
}
