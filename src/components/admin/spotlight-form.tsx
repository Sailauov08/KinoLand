"use client";

import { useActionState, useTransition } from "react";
import { clearSpotlightAction, saveSpotlightAction } from "@/app/actions/admin";
import { initialFormState } from "@/app/actions/types";
import { FormAlert } from "../form-alert";
import { useI18n } from "../i18n-provider";
import { buttonClass } from "../ui";

interface Spotlight {
  movieId: number;
  tagline: { en: string; ru?: string; kk?: string };
}

export function SpotlightForm({ current }: { current: Spotlight | null }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(saveSpotlightAction, initialFormState);
  const [clearing, startClear] = useTransition();

  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <label className="block">
        <span className="label">{t("admin.spotlightMovieId")}</span>
        <input
          name="movieId"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          defaultValue={current?.movieId ?? ""}
          placeholder="e.g. 1398"
          className="field"
          aria-invalid={state.fields?.movieId ? true : undefined}
        />
      </label>
      {(["en", "ru", "kk"] as const).map((l) => (
        <label key={l} className="block">
          <span className="label">
            {t("admin.spotlightTagline", { lang: l.toUpperCase() })}
            {l !== "en" ? <span className="font-normal text-subtle"> · {t("admin.optional")}</span> : null}
          </span>
          <input name={`tagline_${l}`} maxLength={160} defaultValue={current?.tagline[l] ?? ""} className="field" />
        </label>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>
          {pending ? t("auth.pending") : t("admin.save")}
        </button>
        {current ? (
          <button
            type="button"
            disabled={clearing}
            onClick={() => startClear(() => clearSpotlightAction())}
            className={buttonClass("ghost", "md")}
          >
            {t("admin.spotlightClear")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
