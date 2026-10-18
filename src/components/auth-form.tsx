"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/app/actions/auth";
import { initialFormState } from "@/app/actions/types";
import { useI18n } from "./i18n-provider";
import { FormAlert } from "./form-alert";
import { buttonClass } from "./ui";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(mode === "login" ? loginAction : registerAction, initialFormState);
  const invalid = (f: string) => (state.fields?.[f] ? true : undefined);

  return (
    <form key={JSON.stringify(state)} action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert state={state} />
      {mode === "register" ? (
        <label className="block">
          <span className="label">{t("auth.name")}</span>
          <input name="name" required maxLength={60} autoComplete="nickname" className="field" aria-invalid={invalid("name")} defaultValue={state.values?.name} />
        </label>
      ) : null}
      <label className="block">
        <span className="label">{t("auth.email")}</span>
        <input name="email" type="email" required autoComplete="email" inputMode="email" className="field" aria-invalid={invalid("email")} defaultValue={state.values?.email} />
      </label>
      <label className="block">
        <span className="label">{t("auth.password")}</span>
        <input
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : 1}
          maxLength={128}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          className="field"
          aria-invalid={invalid("password")}
          aria-describedby={mode === "register" ? "password-hint" : undefined}
        />
        {mode === "register" ? (
          <span id="password-hint" className="mt-1.5 block text-xs text-subtle">
            {t("auth.passwordHint")}
          </span>
        ) : null}
      </label>
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
        {pending ? t("auth.pending") : mode === "login" ? t("auth.submitSignIn") : t("auth.submitSignUp")}
      </button>
      <p className="pt-2 text-center text-sm text-muted">
        {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
        <Link
          href={`${mode === "login" ? "/register" : "/login"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-accent hover:text-accent-strong"
        >
          {mode === "login" ? t("nav.signUp") : t("nav.signIn")}
        </Link>
      </p>
    </form>
  );
}
