"use client";

import Image from "next/image";
import { useState } from "react";
import { sendEvent } from "./analytics";
import { useI18n } from "./i18n-provider";
import { PlayIcon } from "./icons";

/**
 * Click-to-load YouTube embed (privacy-enhanced youtube-nocookie domain). Nothing from YouTube is
 * requested until the viewer presses play, except the static thumbnail.
 */
export function TrailerPlayer({ videoKey, title, movieId }: { videoKey: string; title: string; movieId: number }) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);
  const safeKey = /^[\w-]{6,20}$/.test(videoKey) ? videoKey : null;
  if (!safeKey) return null;

  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl bg-surface-2 ring-1 ring-line">
      {playing ? (
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${safeKey}?autoplay=1&rel=0&modestbranding=1`}
          title={`${t("movie.trailer")}: ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setPlaying(true);
            sendEvent({ type: "playback_started", path: location.pathname, movieId, props: { source: "trailer", title } });
          }}
          className="group absolute inset-0 size-full text-left"
          aria-label={`${t("movie.playTrailer")}: ${title}`}
        >
          <Image
            src={`https://i.ytimg.com/vi/${safeKey}/hqdefault.jpg`}
            alt=""
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover opacity-70 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-85"
            unoptimized
            onError={() => sendEvent({ type: "playback_error", path: location.pathname, movieId, props: { source: "trailer", title, reason: "thumbnail_unavailable" } })}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-16 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_0_0_10px_rgba(232,180,76,0.18)] transition duration-300 group-hover:scale-110 sm:size-20">
              <PlayIcon size={28} className="translate-x-0.5" />
            </span>
          </span>
          <span className="absolute bottom-4 left-5 right-5 text-xs text-white/70">{t("movie.trailerConsent")}</span>
        </button>
      )}
    </div>
  );
}
