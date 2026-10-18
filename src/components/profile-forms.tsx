"use client";

import clsx from "clsx";
import { useActionState, useState } from "react";
import { changePasswordAction, updateProfileAction } from "@/app/actions/profile";
import { initialFormState } from "@/app/actions/types";
import { localeNames, locales, type Locale } from "@/lib/i18n/config";
import { FormAlert } from "./form-alert";
import { useI18n } from "./i18n-provider";
import { CheckIcon } from "./icons";
import { buttonClass } from "./ui";

export function ProfileForm({
  name,
  locale,
  selected,
  genres,
}: {
  name: string;
  locale: Locale;
  selected: number[];
  genres: { value: number; label: string }[];
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updateProfileAction, initialFormState);
  const [chosen, setChosen] = useState<number[]>(selected);

  return (
    <form action={action} className="space-y-6">
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">{t("auth.name")}</span>
          <input name="name" defaultValue={name} required maxLength={60} className="field" aria-invalid={state.fields?.name ? true : undefined} />
        </label>
        <label className="block">
          <span className="label">{t("nav.language")}</span>
          <select name="locale" defaultValue={locale} className="field">
            {locales.map((l) => (
              <option key={l} value={l}>{localeNames[l]}</option>
            ))}
          </select>
        </label>
      </div>
      <fieldset id="genres" className="scroll-mt-24">
        <legend className="label">{t("profile.genres")}</legend>
        <p className="-mt-1 mb-3 text-xs text-subtle">{t("profile.genresHint")}</p>
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => {
            const active = chosen.includes(g.value);
            return (
              <label
                key={g.value}
                className={clsx(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold ring-1 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                  active ? "bg-accent text-accent-ink ring-accent" : "bg-white/5 text-fg/80 ring-white/10 hover:bg-white/10",
                )}
              >
                <input
                  type="checkbox"
                  name="genres"
                  value={g.value}
                  checked={active}
                  onChange={() => setChosen((c) => (active ? c.filter((x) => x !== g.value) : [...c, g.value]))}
                  className="sr-only"
                />
                {active ? <CheckIcon size={13} /> : null}
                {g.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg")}>
        {pending ? t("auth.pending") : t("profile.save")}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(changePasswordAction, initialFormState);
  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <label className="block">
        <span className="label">{t("profile.currentPassword")}</span>
        <input name="current" type="password" required autoComplete="current-password" className="field" aria-invalid={state.fields?.current ? true : undefined} />
      </label>
      <label className="block">
        <span className="label">{t("profile.newPassword")}</span>
        <input name="next" type="password" required minLength={8} autoComplete="new-password" className="field" aria-invalid={state.fields?.next ? true : undefined} />
        <span className="mt-1.5 block text-xs text-subtle">{t("auth.passwordHint")}</span>
      </label>
      <button type="submit" disabled={pending} className={buttonClass("secondary", "md", "w-full")}>
        {pending ? t("auth.pending") : t("profile.updatePassword")}
      </button>
    </form>
  );
}
