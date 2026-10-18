"use client";

import clsx from "clsx";
import { useI18n } from "./i18n-provider";
import { BookmarkFilledIcon, BookmarkIcon, HeartFilledIcon, HeartIcon } from "./icons";
import { useListState } from "./list-state";
import { buttonClass } from "./ui";

export function ListButtons({ movieId, size = "lg" }: { movieId: number; size?: "md" | "lg" }) {
  const { t } = useI18n();
  const { has, toggle, isPending, signedIn } = useListState();
  const inWatch = has("watchlist", movieId);
  const inFav = has("favorite", movieId);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => toggle("watchlist", movieId)}
        disabled={isPending("watchlist", movieId)}
        aria-pressed={inWatch}
        title={signedIn ? undefined : t("list.signInToSave")}
        className={buttonClass(inWatch ? "primary" : "secondary", size)}
      >
        {inWatch ? <BookmarkFilledIcon size={18} /> : <BookmarkIcon size={18} />}
        {inWatch ? t("list.inWatchlist") : t("list.addWatchlist")}
      </button>
      <button
        type="button"
        onClick={() => toggle("favorite", movieId)}
        disabled={isPending("favorite", movieId)}
        aria-pressed={inFav}
        aria-label={inFav ? t("list.removeFavorite") : t("list.addFavorite")}
        title={inFav ? t("list.removeFavorite") : t("list.addFavorite")}
        className={buttonClass("secondary", size === "lg" ? "icon-lg" : "icon", inFav ? "text-danger" : undefined)}
      >
        {inFav ? <HeartFilledIcon size={19} /> : <HeartIcon size={19} />}
      </button>
    </div>
  );
}

/** Compact watchlist toggle overlaid on poster cards. */
export function CardWatchlistButton({ movieId, title }: { movieId: number; title: string }) {
  const { t } = useI18n();
  const { has, toggle, isPending } = useListState();
  const active = has("watchlist", movieId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle("watchlist", movieId);
      }}
      disabled={isPending("watchlist", movieId)}
      aria-pressed={active}
      aria-label={`${active ? t("list.removeWatchlist") : t("list.addWatchlist")}: ${title}`}
      title={active ? t("list.removeWatchlist") : t("list.addWatchlist")}
      className={clsx(
        "grid size-9 place-items-center rounded-full backdrop-blur-md transition duration-200",
        active
          ? "bg-accent text-accent-ink opacity-100"
          : "bg-black/55 text-white opacity-100 ring-1 ring-white/20 hover:bg-black/75 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
      )}
    >
      {active ? <BookmarkFilledIcon size={16} /> : <BookmarkIcon size={16} />}
    </button>
  );
}
