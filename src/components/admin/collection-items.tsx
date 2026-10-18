"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { addCollectionItemAction, adminSearchAction, moveCollectionItemAction, removeCollectionItemAction } from "@/app/actions/admin";
import type { MovieSnapshot, MovieSummary } from "@/lib/movies/types";
import { useI18n } from "../i18n-provider";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, PlusIcon, SearchIcon, TrashIcon } from "../icons";
import { PosterImage } from "../poster";
import { buttonClass } from "../ui";

export function CollectionItems({ collectionId, items }: { collectionId: number; items: MovieSnapshot[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MovieSummary[] | null>(null);
  const [searching, startSearch] = useTransition();
  const [adding, setAdding] = useState<number | null>(null);
  const ids = new Set(items.map((i) => i.id));

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    startSearch(async () => {
      const res = await adminSearchAction(query);
      setResults(res.results);
    });
  };

  const add = async (movieId: number) => {
    setAdding(movieId);
    try {
      await addCollectionItemAction(collectionId, movieId);
      router.refresh();
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section aria-labelledby="add-films" className="min-w-0">
        <h3 id="add-films" className="mb-3 font-display text-base font-medium">{t("admin.addFilms")}</h3>
        <form onSubmit={onSearch} role="search" className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.searchFilms")}
            aria-label={t("admin.searchFilms")}
            className="field"
          />
          <button type="submit" disabled={searching} className={buttonClass("secondary", "md", "shrink-0")} aria-label={t("search.submit")}>
            <SearchIcon size={18} />
          </button>
        </form>
        <ul className="mt-4 space-y-2" aria-busy={searching}>
          {results?.length === 0 ? <li className="text-sm text-muted">{t("search.noResults")}</li> : null}
          {results?.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-surface p-2 ring-1 ring-line">
              <PosterImage title={m.title} year={m.year} path={m.posterPath} sizes="40px" thumb className="w-10 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.title}</p>
                <p className="text-xs text-subtle">{m.year ?? "—"} · #{m.id}</p>
              </div>
              <button
                type="button"
                disabled={ids.has(m.id) || adding === m.id}
                onClick={() => add(m.id)}
                className={buttonClass(ids.has(m.id) ? "ghost" : "secondary", "sm")}
              >
                {ids.has(m.id) ? <CheckIcon size={15} /> : <PlusIcon size={15} />}
                {ids.has(m.id) ? t("admin.added") : t("admin.add")}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="current-films" className="min-w-0">
        <h3 id="current-films" className="mb-3 font-display text-base font-medium">
          {t("admin.films")} <span className="text-muted">({items.length})</span>
        </h3>
        {items.length ? (
          <ol className="space-y-2">
            {items.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-surface p-2 ring-1 ring-line">
                <span className="w-6 text-center text-xs text-subtle tabular-nums">{i + 1}</span>
                <PosterImage title={m.title} year={m.year} path={m.posterPath} sizes="40px" thumb className="w-10 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.title}</p>
                  <p className="text-xs text-subtle">{m.year ?? "—"}</p>
                </div>
                <ItemButton collectionId={collectionId} movieId={m.id} action={moveCollectionItemAction} extra={{ direction: "up" }} disabled={i === 0} label={t("admin.moveUp")}>
                  <ArrowUpIcon size={15} />
                </ItemButton>
                <ItemButton collectionId={collectionId} movieId={m.id} action={moveCollectionItemAction} extra={{ direction: "down" }} disabled={i === items.length - 1} label={t("admin.moveDown")}>
                  <ArrowDownIcon size={15} />
                </ItemButton>
                <ItemButton collectionId={collectionId} movieId={m.id} action={removeCollectionItemAction} label={t("admin.remove")} danger>
                  <TrashIcon size={15} />
                </ItemButton>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">{t("admin.noItems")}</p>
        )}
      </section>
    </div>
  );
}

function ItemButton({
  collectionId,
  movieId,
  action,
  extra,
  disabled,
  label,
  danger,
  children,
}: {
  collectionId: number;
  movieId: number;
  action: (fd: FormData) => Promise<void>;
  extra?: Record<string, string>;
  disabled?: boolean;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="collectionId" value={collectionId} />
      <input type="hidden" name="movieId" value={movieId} />
      {extra ? Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />) : null}
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        title={label}
        className={buttonClass("ghost", "icon-sm", danger ? "hover:text-danger" : undefined)}
      >
        {children}
      </button>
    </form>
  );
}
