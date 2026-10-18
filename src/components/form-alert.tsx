"use client";

import clsx from "clsx";
import type { FormState } from "@/app/actions/types";
import { useI18n } from "./i18n-provider";
import { CheckIcon, InfoIcon } from "./icons";

export function FormAlert({ state }: { state: FormState }) {
  const { t } = useI18n();
  const text = state.error ? t(state.error) : state.message ? t(state.message) : null;
  return (
    <div aria-live="polite" role={state.error ? "alert" : "status"}>
      {text ? (
        <p
          className={clsx(
            "flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm",
            state.error ? "bg-danger/10 text-danger ring-1 ring-danger/25" : "bg-success/10 text-success ring-1 ring-success/25",
          )}
        >
          {state.error ? <InfoIcon size={17} className="mt-px shrink-0" /> : <CheckIcon size={17} className="mt-px shrink-0" />}
          {text}
        </p>
      ) : null}
    </div>
  );
}
