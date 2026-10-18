"use client";

import clsx from "clsx";
import { useActionState, useRef, useState, type ReactNode } from "react";
import type { AdminFormState } from "@/app/actions/admin";
import {
  addProviderLinkAction,
  hideMovieAction,
  purgeEventsAction,
  saveBannerAction,
  saveDisplaySettingsAction,
} from "@/app/actions/admin";
import { CheckIcon, InfoIcon } from "../icons";
import { buttonClass } from "../ui";
import { useAdminT } from "./admin-i18n";

type StatefulAction = (prev: AdminFormState, fd: FormData) => Promise<AdminFormState>;
type VoidAction = (fd: FormData) => Promise<void>;

export function ActionMessage({ state }: { state: AdminFormState }) {
  const at = useAdminT();
  const key = state.error ?? state.message;
  return (
    <div aria-live="polite" role={state.error ? "alert" : "status"}>
      {key ? (
        <p className={clsx("flex items-start gap-2 rounded-xl px-3 py-2 text-xs", state.error ? "bg-danger/10 text-danger ring-1 ring-danger/25" : "bg-success/10 text-success ring-1 ring-success/25")}>
          {state.error ? <InfoIcon size={15} className="mt-px shrink-0" /> : <CheckIcon size={15} className="mt-px shrink-0" />}
          {at(key, state.vars)}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A form whose submission must be confirmed in a modal <dialog> first (focus trapping and Esc are
 * handled by the browser). The form submits for real only after "Confirm".
 */
function ConfirmForm({
  action,
  confirmText,
  tone,
  className,
  children,
}: {
  action: (fd: FormData) => void | Promise<void>;
  confirmText: string;
  tone: "danger" | "primary";
  className?: string;
  children: ReactNode;
}) {
  const at = useAdminT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);

  const onSubmit = (e: React.FormEvent) => {
    if (confirmed.current) {
      confirmed.current = false;
      return;
    }
    e.preventDefault();
    dialogRef.current?.showModal();
  };
  const accept = () => {
    dialogRef.current?.close();
    confirmed.current = true;
    formRef.current?.requestSubmit();
  };

  return (
    <>
      <form ref={formRef} action={action} onSubmit={onSubmit} className={className}>
        {children}
      </form>
      <dialog ref={dialogRef} className="m-auto w-[min(92vw,440px)] rounded-2xl bg-surface-2 p-0 text-fg shadow-2xl ring-1 ring-line-strong backdrop:bg-black/70">
        <div className="p-5">
          <p className="text-sm leading-relaxed">{confirmText}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" autoFocus onClick={() => dialogRef.current?.close()} className={buttonClass("ghost", "sm")}>
              {at("confirm.cancel")}
            </button>
            <button type="button" onClick={accept} className={buttonClass(tone === "danger" ? "danger" : "primary", "sm")}>
              {at("confirm.confirm")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

const Hidden = ({ fields }: { fields: Record<string, string> }) => (
  <>
    {Object.entries(fields).map(([k, v]) => (
      <input key={k} type="hidden" name={k} value={v} />
    ))}
  </>
);

/** Single-button form for a consequential stateful action, with confirmation and inline result. */
export function ConfirmActionForm({
  action,
  fields,
  label,
  confirmText,
  tone = "primary",
  disabled,
}: {
  action: StatefulAction;
  fields: Record<string, string>;
  label: string;
  confirmText: string;
  tone?: "danger" | "primary";
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div className="space-y-2">
      <ConfirmForm action={formAction} confirmText={confirmText} tone={tone}>
        <Hidden fields={fields} />
        <button type="submit" disabled={pending || disabled} className={buttonClass(tone === "danger" ? "danger" : "secondary", "sm", "w-full sm:w-auto")}>
          {label}
        </button>
      </ConfirmForm>
      <ActionMessage state={state} />
    </div>
  );
}

/** Small confirm-then-submit form for fire-and-forget actions (delete, remove…). */
export function ConfirmVoidForm({ action, fields, label, confirmText, icon }: { action: VoidAction; fields: Record<string, string>; label: string; confirmText: string; icon?: ReactNode }) {
  return (
    <ConfirmForm action={action} confirmText={confirmText} tone="danger">
      <Hidden fields={fields} />
      <button type="submit" className={buttonClass("ghost", "sm", "text-danger hover:bg-danger/10 hover:text-danger")} aria-label={label} title={label}>
        {icon ?? label}
      </button>
    </ConfirmForm>
  );
}

const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="block min-w-0">
    <span className="label">
      {label}
      {hint ? <span className="font-normal text-subtle"> · {hint}</span> : null}
    </span>
    {children}
  </label>
);

export interface BannerValues {
  id?: number;
  movieId?: number;
  headline: { en?: string; ru?: string; kk?: string };
  description: { en?: string; ru?: string; kk?: string };
  isActive: boolean;
  position: number;
}

export function BannerForm({ initial, title }: { initial?: BannerValues; title?: string }) {
  const at = useAdminT();
  const [state, formAction, pending] = useActionState(saveBannerAction, {});
  const bad = (f: string) => (state.fields?.[f] ? true : undefined);
  const langs = ["en", "ru", "kk"] as const;
  return (
    <form action={formAction} className="space-y-4">
      {title ? <p className="text-sm font-semibold">{title}</p> : null}
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
        <Field label={at("content.movieId")}>
          <input name="movieId" inputMode="numeric" required defaultValue={initial?.movieId ?? ""} className="field" aria-invalid={bad("movieId")} placeholder="1398" />
        </Field>
        <Field label={at("content.position")}>
          <input name="position" type="number" min={0} max={999} defaultValue={initial?.position ?? 0} className="field" />
        </Field>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {langs.map((l) => (
          <div key={l} className="space-y-3 rounded-xl bg-surface-2/60 p-3 ring-1 ring-line">
            <Field label={at("content.headline", { lang: l.toUpperCase() })} hint={at("content.optional")}>
              <input name={`headline_${l}`} maxLength={60} defaultValue={initial?.headline[l] ?? ""} className="field" />
            </Field>
            <Field label={at("content.description", { lang: l.toUpperCase() })} hint={at("content.optional")}>
              <textarea name={`description_${l}`} maxLength={200} rows={2} defaultValue={initial?.description[l] ?? ""} className="field resize-y" />
            </Field>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} className="size-4 accent-[var(--color-accent)]" />
          {at("content.active")}
        </label>
        <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
          {at("content.save")}
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function HideMovieForm() {
  const at = useAdminT();
  const [state, formAction, pending] = useActionState(hideMovieAction, {});
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
        <Field label={at("content.movieId")}>
          <input name="movieId" inputMode="numeric" required className="field" aria-invalid={state.fields?.movieId ? true : undefined} />
        </Field>
        <Field label={at("content.reason")} hint={at("content.optional")}>
          <input name="reason" maxLength={200} className="field" />
        </Field>
        <button type="submit" disabled={pending} className={buttonClass("secondary", "md")}>
          {at("content.hideMovie")}
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function QuickHideButton({ movieId }: { movieId: number }) {
  const at = useAdminT();
  const [, formAction, pending] = useActionState(hideMovieAction, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="movieId" value={movieId} />
      <button type="submit" disabled={pending} className="rounded-md px-2 py-1 text-[0.7rem] font-semibold text-subtle transition hover:bg-danger/10 hover:text-danger">
        {at("movies.hide")}
      </button>
    </form>
  );
}

export function ProviderForm() {
  const at = useAdminT();
  const [state, formAction, pending] = useActionState(addProviderLinkAction, {});
  const bad = (f: string) => (state.fields?.[f] ? true : undefined);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[130px_1fr_1.6fr_100px_auto] lg:items-end">
        <Field label={at("content.movieId")}>
          <input name="movieId" inputMode="numeric" required className="field" aria-invalid={bad("movieId")} />
        </Field>
        <Field label={at("content.provider")}>
          <input name="provider" required maxLength={40} className="field" aria-invalid={bad("provider")} placeholder="Kinopoisk HD" />
        </Field>
        <Field label={at("content.url")}>
          <input name="url" type="url" required maxLength={500} className="field" aria-invalid={bad("url")} placeholder="https://" />
        </Field>
        <Field label={at("content.region")}>
          <input name="region" maxLength={2} className="field uppercase" aria-invalid={bad("region")} placeholder="KZ" />
        </Field>
        <button type="submit" disabled={pending} className={buttonClass("secondary", "md")}>
          {at("content.addProvider")}
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function DisplaySettingsForm({ values }: { values: Record<string, boolean> }) {
  const at = useAdminT();
  const [state, formAction, pending] = useActionState(saveDisplaySettingsAction, {});
  const items = [
    ["showTrending", "content.show.trending"],
    ["showTopRated", "content.show.topRated"],
    ["showNowPlaying", "content.show.nowPlaying"],
    ["showUpcoming", "content.show.upcoming"],
    ["showGenreMoods", "content.show.genreMoods"],
    ["showPersonalized", "content.show.personalized"],
  ] as const;
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map(([name, key]) => (
          <label key={name} className="flex cursor-pointer items-center gap-3 rounded-xl bg-surface-2/60 px-3 py-2.5 text-sm ring-1 ring-line">
            <input type="checkbox" name={name} defaultChecked={values[name]} className="size-4 accent-[var(--color-accent)]" />
            {at(key)}
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <ActionMessage state={state} />
        <button type="submit" disabled={pending} className={buttonClass("primary", "sm", "ml-auto")}>
          {at("content.save")}
        </button>
      </div>
    </form>
  );
}

export function RetentionForm({ days }: { days: number }) {
  const at = useAdminT();
  const [state, formAction, pending] = useActionState(purgeEventsAction, {});
  const [value, setValue] = useState(days);
  return (
    <div className="space-y-3">
      <ConfirmForm action={formAction} confirmText={at("settings.purgeConfirm")} tone="danger" className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">{at("settings.retention")}</span>
          <span className="flex items-center gap-2">
            <input name="days" type="number" min={7} max={730} value={value} onChange={(e) => setValue(Number(e.target.value))} className="field w-28" aria-invalid={state.fields?.days ? true : undefined} />
            <span className="text-sm text-muted">{at("settings.days")}</span>
          </span>
        </label>
        <button type="submit" disabled={pending} className={buttonClass("danger", "md")}>
          {at("settings.applyPurge")}
        </button>
      </ConfirmForm>
      <ActionMessage state={state} />
    </div>
  );
}
