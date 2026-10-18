import Link from "next/link";
import type { TFunction } from "@/lib/i18n/translate";

export function Footer({ t }: { t: TFunction }) {
  return (
    <footer className="mt-24 border-t border-line bg-surface/40">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-display text-lg font-semibold tracking-[0.18em]">KINO</p>
          <p className="mt-2 max-w-sm text-sm text-muted">{t("meta.tagline")}</p>
          <nav aria-label="Footer" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            <Link className="hover:text-fg" href="/top">{t("nav.top")}</Link>
            <Link className="hover:text-fg" href="/search">{t("nav.search")}</Link>
            <Link className="hover:text-fg" href="/collections">{t("nav.collections")}</Link>
            <Link className="hover:text-fg" href="/for-you">{t("nav.forYou")}</Link>
          </nav>
        </div>
        <div className="space-y-3 text-xs leading-relaxed text-subtle">
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md bg-gradient-to-r from-[#90cea1] via-[#3cbec9] to-[#01b4e4] px-2.5 py-1 text-[0.7rem] font-extrabold tracking-wider text-[#0d253f]"
            aria-label="The Movie Database (TMDB)"
          >
            TMDB
          </a>
          <p>{t("footer.tmdb")}</p>
          <p>{t("footer.data")}</p>
          <p>{t("footer.rights")}</p>
          <p>© {new Date().getFullYear()} KINO</p>
        </div>
      </div>
    </footer>
  );
}
