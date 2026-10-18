"use client";

import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { useI18n } from "./i18n-provider";
import { CheckIcon, FilterIcon, SearchIcon } from "./icons";
import { buttonClass } from "./ui";

export interface FilterValues {
  q?: string;
  genres: number[];
  yearFrom?: number | null;
  yearTo?: number | null;
  decade?: number | null;
  rating?: number | null;
  lang?: string | null;
  sort: string;
}

interface Option<T> {
  value: T;
  label: string;
}

/**
 * URL-driven filter controls. Every change updates the query string (replace, no scroll), so
 * results are server-rendered, shareable and work with the back button.
 */
export function FilterPanel({
  mode,
  values,
  genres,
  languages,
  sorts,
  decades,
}: {
  mode: "search" | "top";
  values: FilterValues;
  genres: Option<number>[];
  languages: Option<string>[];
  sorts: Option<string>[];
  decades?: Option<number>[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(values.q ?? "");

  const push = (next: Partial<FilterValues>) => {
    const v = { ...values, q: query, ...next };
    const sp = new URLSearchParams();
    if (mode === "search" && v.q?.trim()) sp.set("q", v.q.trim());
    if (v.genres.length) sp.set("genre", v.genres.join(","));
    if (v.yearFrom) sp.set("yearFrom", String(v.yearFrom));
    if (v.yearTo) sp.set("yearTo", String(v.yearTo));
    if (v.decade) sp.set("decade", String(v.decade));
    if (v.rating) sp.set("rating", String(v.rating));
    if (v.lang) sp.set("lang", v.lang);
    if (v.sort && v.sort !== sorts[0]?.value) sp.set("sort", v.sort);
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const toggleGenre = (id: number) => {
    if (mode === "top") return push({ genres: values.genres[0] === id ? [] : [id] });
    push({ genres: values.genres.includes(id) ? values.genres.filter((g) => g !== id) : [...values.genres, id] });
  };

  const activeCount =
    values.genres.length + (values.yearFrom ? 1 : 0) + (values.yearTo ? 1 : 0) + (values.decade ? 1 : 0) + (values.rating ? 1 : 0) + (values.lang ? 1 : 0);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    push({});
  };

  const years = Array.from({ length: new Date().getFullYear() + 1 - 1920 + 1 }, (_, i) => new Date().getFullYear() + 1 - i);

  return (
    <div className={clsx("transition-opacity", pending && "opacity-70")} aria-busy={pending}>
      <form onSubmit={onSubmit} role="search" className="flex flex-col gap-3 sm:flex-row">
        {mode === "search" ? (
          <div className="relative flex-1">
            <SearchIcon size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              aria-label={t("search.title")}
              maxLength={100}
              className="field h-12 rounded-full pl-11 text-base"
            />
          </div>
        ) : null}
        <div className="flex gap-2">
          {mode === "search" ? (
            <button type="submit" className={buttonClass("primary", "lg", "flex-1 sm:flex-none")}>
              {t("search.submit")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="filter-controls"
            className={buttonClass("secondary", "lg", clsx("lg:hidden", mode === "top" && "flex-1"))}
          >
            <FilterIcon size={18} />
            {open ? t("filters.hide") : t("filters.show")}
            {activeCount ? <span className="grid size-5 place-items-center rounded-full bg-accent text-[0.65rem] text-accent-ink">{activeCount}</span> : null}
          </button>
        </div>
      </form>

      <div id="filter-controls" className={clsx("mt-5 space-y-5", open ? "block" : "hidden lg:block")}>
        <fieldset>
          <legend className="label">{t("filters.genres")}</legend>
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => {
              const active = values.genres.includes(g.value);
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => toggleGenre(g.value)}
                  aria-pressed={active}
                  className={clsx(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold ring-1 transition",
                    active ? "bg-accent text-accent-ink ring-accent" : "bg-white/5 text-fg/80 ring-white/10 hover:bg-white/10 hover:text-fg",
                  )}
                >
                  {active ? <CheckIcon size={13} /> : null}
                  {g.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {mode === "search" ? (
            <>
              <label>
                <span className="label">{t("filters.yearFrom")}</span>
                <select className="field" value={values.yearFrom ?? ""} onChange={(e) => push({ yearFrom: Number(e.target.value) || null })}>
                  <option value="">—</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">{t("filters.yearTo")}</span>
                <select className="field" value={values.yearTo ?? ""} onChange={(e) => push({ yearTo: Number(e.target.value) || null })}>
                  <option value="">—</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">{t("filters.rating")}</span>
                <select className="field" value={values.rating ?? ""} onChange={(e) => push({ rating: Number(e.target.value) || null })}>
                  <option value="">{t("filters.anyRating")}</option>
                  {[9, 8, 7, 6, 5].map((r) => (
                    <option key={r} value={r}>{`${r}+ ★`}</option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <label>
              <span className="label">{t("filters.decade")}</span>
              <select className="field" value={values.decade ?? ""} onChange={(e) => push({ decade: Number(e.target.value) || null })}>
                <option value="">{t("filters.anyDecade")}</option>
                {decades?.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span className="label">{t("filters.language")}</span>
            <select className="field" value={values.lang ?? ""} onChange={(e) => push({ lang: e.target.value || null })}>
              <option value="">{t("filters.anyLanguage")}</option>
              {languages.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{t("filters.sort")}</span>
            <select className="field" value={values.sort} onChange={(e) => push({ sort: e.target.value })}>
              {sorts.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          {activeCount || (mode === "search" && values.q) ? (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  startTransition(() => router.replace(pathname, { scroll: false }));
                }}
                className={buttonClass("ghost", "md", "w-full")}
              >
                {t("filters.reset")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
