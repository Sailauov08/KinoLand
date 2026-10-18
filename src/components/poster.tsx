"use client";

import clsx from "clsx";
import Image from "next/image";
import { useState } from "react";
import { tmdbImage } from "@/lib/movies/images";

/** Next 16 replacement for the deprecated `priority`: load above-the-fold artwork immediately. */
const eager = (priority?: boolean) => (priority ? ({ loading: "eager", fetchPriority: "high" } as const) : {});

/**
 * Neutral placeholder for titles TMDB has no artwork for (or when an image fails to load).
 * It never imitates key art: just the title on a quiet surface.
 */
function PosterPlaceholder({ title, year, compact }: { title: string; year?: number | null; compact?: boolean }) {
  return (
    <div role="img" aria-label={title} className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-surface-3 to-surface-2 p-3">
      <svg aria-hidden viewBox="0 0 24 24" width={compact ? 18 : 26} height={compact ? 18 : 26} fill="none" stroke="currentColor" strokeWidth="1.5" className={clsx("text-subtle", compact && "m-auto")}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
      </svg>
      {compact ? null : (
        <div>
          {year ? <p className="text-[0.65rem] tracking-[0.2em] text-subtle">{year}</p> : null}
          <p className="mt-1 line-clamp-4 font-display text-sm leading-tight text-fg/80">{title}</p>
        </div>
      )}
    </div>
  );
}

export function PosterImage({
  title,
  year,
  path,
  sizes = "(min-width: 1280px) 220px, (min-width: 768px) 180px, 40vw",
  priority,
  thumb,
  className,
}: {
  title: string;
  year?: number | null;
  path: string | null;
  sizes?: string;
  priority?: boolean;
  /** Small thumbnail: the placeholder shows only an icon. */
  thumb?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = tmdbImage(path);
  return (
    <div className={clsx("relative aspect-[2/3] overflow-hidden bg-surface-2", className)}>
      {src && !failed ? (
        <Image src={src} alt={title} fill sizes={sizes} {...eager(priority)} className="object-cover" onError={() => setFailed(true)} />
      ) : (
        <PosterPlaceholder title={title} year={year} compact={thumb} />
      )}
    </div>
  );
}

/** Full-bleed backdrop; falls back to the poster (blurred) or a quiet gradient when TMDB has none. */
export function BackdropImage({
  path,
  fallbackPosterPath,
  priority,
  className,
}: {
  path: string | null;
  fallbackPosterPath?: string | null;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = tmdbImage(path);
  const poster = tmdbImage(fallbackPosterPath);
  if (src && !failed) {
    return <Image src={src} alt="" fill sizes="100vw" {...eager(priority)} className={clsx("object-cover", className)} onError={() => setFailed(true)} />;
  }
  if (poster) {
    return <Image src={poster} alt="" fill sizes="50vw" {...eager(priority)} className={clsx("scale-110 object-cover opacity-40 blur-2xl", className)} />;
  }
  return (
    <div
      aria-hidden
      className={clsx("absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,#2a2219_0%,transparent_60%),linear-gradient(160deg,#17130f,#0b0a09)]", className)}
    />
  );
}
