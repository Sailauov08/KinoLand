import Link from "next/link";
import type { TFunction } from "@/lib/i18n/translate";
import { Logo } from "./logo";
import { TmdbLogo } from "./tmdb-logo";

/**
 * Compact footer. The TMDB logo + notice stay here (TMDB requires them to be shown prominently
 * in the app and the logo to be less prominent than KinoLand's); full credits live on /about.
 */
export function Footer({ t }: { t: TFunction }) {
  const link = "rounded-sm text-muted transition hover:text-fg";
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page flex flex-col gap-5 py-7 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <Link href="/" className="group w-fit rounded-md" aria-label="KinoLand">
            <Logo compact />
          </Link>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link className={link} href="/top">{t("nav.top")}</Link>
            <Link className={link} href="/search">{t("nav.search")}</Link>
            <Link className={link} href="/for-you">{t("nav.forYou")}</Link>
            <Link className={link} href="/about">{t("nav.about")}</Link>
          </nav>
        </div>
        <p className="text-xs text-subtle">© {new Date().getFullYear()} KinoLand</p>
      </div>
      <div className="border-t border-line/60">
        <div className="container-page flex flex-col gap-2 py-4 text-[0.72rem] leading-relaxed text-subtle sm:flex-row sm:items-center sm:gap-4">
          <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="shrink-0 opacity-80 transition hover:opacity-100">
            <TmdbLogo height={11} />
          </a>
          <p>
            {t("footer.tmdb")}{" "}
            <Link href="/about#credits" className="underline decoration-line-strong underline-offset-2 hover:text-fg">
              {t("footer.credits")}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
