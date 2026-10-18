import { env } from "@/lib/env";
import type { TFunction } from "@/lib/i18n/translate";
import type { UnavailableReason } from "@/lib/movies/types";
import { ExternalIcon, FilmIcon } from "./icons";
import { buttonClass } from "./ui";

/**
 * Shown in place of movie content when TMDB can't be used.
 * - Missing key in development: a developer setup card (exact .env.local line + where to get a key).
 * - Production, or TMDB down: a short, neutral end-user message — no setup details, no banner.
 */
export function MoviesUnavailable({ reason, t, className }: { reason: UnavailableReason; t: TFunction; className?: string }) {
  const showSetup = reason === "unconfigured" && !env.isProduction;
  if (!showSetup) {
    return (
      <div role="status" className={className}>
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center">
          <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-white/5 text-accent">
            <FilmIcon size={26} />
          </div>
          <h2 className="font-display text-lg font-medium">{t("unavailable.title")}</h2>
          <p className="mt-2 max-w-md text-sm text-muted">{t("unavailable.text")}</p>
        </div>
      </div>
    );
  }
  return (
    <div role="status" className={className}>
      <div className="rounded-3xl bg-surface p-6 ring-1 ring-accent/25 sm:p-8">
        <p className="eyebrow">Developer setup</p>
        <h2 className="mt-2 font-display text-xl font-medium">{t("setup.title")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t("setup.text")}</p>
        <pre className="mt-5 overflow-x-auto rounded-2xl bg-ink px-4 py-3 font-mono text-[0.8rem] text-accent-strong ring-1 ring-line">
          <code>{"# .env.local\nTMDB_READ_ACCESS_TOKEN=your_tmdb_read_access_token"}</code>
        </pre>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md")}>
            {t("setup.link")} <ExternalIcon size={15} />
          </a>
          <span className="text-xs text-subtle">{t("setup.devOnly")}</span>
        </div>
      </div>
    </div>
  );
}
