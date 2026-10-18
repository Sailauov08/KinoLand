import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { TmdbLogo } from "@/components/tmdb-logo";
import { PageHeader } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("about.title"), description: t("about.intro") };
}

export default async function AboutPage() {
  const { t } = await getT();
  const card = "rounded-3xl bg-surface p-6 ring-1 ring-line sm:p-8";
  return (
    <div className="container-page max-w-4xl">
      <PageHeader eyebrow="KinoLand" title={t("about.title")} subtitle={t("about.intro")} />
      <div className="space-y-6">
        <section aria-labelledby="about-what" className={card}>
          <Logo />
          <h2 id="about-what" className="mt-5 font-display text-lg font-medium">{t("about.whatTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("about.whatText")}</p>
        </section>

        <section id="credits" aria-labelledby="about-credits" className={`${card} scroll-mt-24`}>
          <h2 id="about-credits" className="font-display text-lg font-medium">{t("about.creditsTitle")}</h2>
          <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="mt-5 inline-block">
            <TmdbLogo height={18} />
          </a>
          <p className="mt-4 text-sm leading-relaxed text-fg/90">{t("footer.tmdb")}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("footer.data")}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted">{t("about.trailers")}</p>
        </section>

        <section aria-labelledby="about-privacy" className={card}>
          <h2 id="about-privacy" className="font-display text-lg font-medium">{t("about.privacyTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>{t("about.privacy1")}</li>
            <li>{t("about.privacy2")}</li>
            <li>{t("about.privacy3")}</li>
          </ul>
        </section>

        <p className="px-1 text-xs text-subtle">{t("footer.rights")}</p>
      </div>
    </div>
  );
}
