import clsx from "clsx";
import type { DataNotice as Notice } from "@/lib/movies/types";
import type { TFunction } from "@/lib/i18n/translate";
import { InfoIcon } from "./icons";

/**
 * Honest labelling whenever the offline demo catalogue is shown instead of live TMDB data.
 * "unconfigured" is rendered once globally by the layout; pages render "unavailable" inline.
 */
export function DataNotice({ notice, t, inline }: { notice?: Notice; t: TFunction; inline?: boolean }) {
  if (!notice || (inline && notice === "unconfigured")) return null;
  return (
    <div role="status" className={clsx("border-accent/20 bg-accent/[0.07]", inline ? "mt-4 rounded-2xl border" : "border-b")}>
      <div
        className={clsx(
          "flex items-start gap-2.5 py-2.5 text-[0.8rem] leading-snug text-accent-strong sm:items-center",
          inline ? "px-4" : "container-page",
        )}
      >
        <InfoIcon size={16} className="mt-0.5 shrink-0 sm:mt-0" />
        <p>
          <strong className="font-semibold">{t("data.demoBadge")}.</strong>{" "}
          {notice === "unconfigured" ? t("data.demoUnconfigured") : t("data.demoUnavailable")}
        </p>
      </div>
    </div>
  );
}
