"use client";

import { useActionState } from "react";
import { deleteCollectionAction, saveCollectionAction } from "@/app/actions/admin";
import { initialFormState } from "@/app/actions/types";
import { FormAlert } from "../form-alert";
import { useI18n } from "../i18n-provider";
import { TrashIcon } from "../icons";
import { buttonClass } from "../ui";

export interface CollectionFormValues {
  id?: number;
  slug: string;
  title: { en: string; ru?: string; kk?: string };
  description: { en: string; ru?: string; kk?: string };
  isPublished: boolean;
  isFeatured: boolean;
  position: number;
}

const LANGS = ["en", "ru", "kk"] as const;

export function CollectionForm({ initial }: { initial?: CollectionFormValues }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(saveCollectionAction, initialFormState);
  const bad = (f: string) => (state.fields?.[f] ? true : undefined);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-6">
        {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
        <FormAlert state={state} />
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <label className="block">
            <span className="label">{t("admin.slug")}</span>
            <input
              name="slug"
              required
              defaultValue={initial?.slug}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={60}
              placeholder="soviet-classics"
              className="field font-mono text-sm"
              aria-invalid={bad("slug")}
              aria-describedby="slug-hint"
            />
            <span id="slug-hint" className="mt-1.5 block text-xs text-subtle">{t("admin.slugHint")}</span>
          </label>
          <label className="block">
            <span className="label">{t("admin.position")}</span>
            <input name="position" type="number" min={0} max={999} defaultValue={initial?.position ?? 0} className="field" />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {LANGS.map((l) => (
            <div key={l} className="space-y-3 rounded-2xl bg-surface-2/60 p-4 ring-1 ring-line">
              <p className="text-xs font-bold tracking-widest text-accent uppercase">{l}</p>
              <label className="block">
                <span className="label">
                  {t("admin.titleField", { lang: l.toUpperCase() })}
                  {l !== "en" ? <span className="font-normal text-subtle"> · {t("admin.optional")}</span> : null}
                </span>
                <input
                  name={`title_${l}`}
                  required={l === "en"}
                  maxLength={120}
                  defaultValue={initial?.title[l] ?? ""}
                  className="field"
                  aria-invalid={bad(`title.${l}`)}
                />
              </label>
              <label className="block">
                <span className="label">
                  {t("admin.descriptionField", { lang: l.toUpperCase() })}
                  <span className="font-normal text-subtle"> · {t("admin.optional")}</span>
                </span>
                <textarea name={`description_${l}`} rows={3} maxLength={600} defaultValue={initial?.description[l] ?? ""} className="field resize-y" />
              </label>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" name="isPublished" defaultChecked={initial?.isPublished} className="size-4 accent-[var(--color-accent)]" />
            {t("admin.published")}
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" name="isFeatured" defaultChecked={initial?.isFeatured} className="size-4 accent-[var(--color-accent)]" />
            {t("admin.featuredHome")}
          </label>
        </div>

        <button type="submit" disabled={pending} className={buttonClass("primary", "lg")}>
          {pending ? t("auth.pending") : initial?.id ? t("admin.save") : t("admin.create")}
        </button>
      </form>

      {initial?.id ? (
        <form
          action={deleteCollectionAction}
          onSubmit={(e) => {
            if (!window.confirm(t("admin.deleteConfirm"))) e.preventDefault();
          }}
          className="border-t border-line pt-6"
        >
          <input type="hidden" name="id" value={initial.id} />
          <button type="submit" className={buttonClass("danger", "md")}>
            <TrashIcon size={16} /> {t("admin.delete")}
          </button>
        </form>
      ) : null}
    </div>
  );
}
