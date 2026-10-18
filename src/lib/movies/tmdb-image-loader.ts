"use client";

/**
 * next/image loader for TMDB artwork. TMDB's CDN already serves pre-sized JPEGs, so instead of
 * re-encoding on our server, each srcset width is mapped to the nearest TMDB size (rounding up).
 * Any non-TMDB URL is returned unchanged.
 */
const TMDB_WIDTHS = [92, 154, 185, 300, 342, 500, 780, 1280] as const;
const TMDB_PATH = /^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]+(\/.+)$/;

export function tmdbSizeFor(width: number): string {
  const match = TMDB_WIDTHS.find((w) => w >= width);
  return match ? `w${match}` : "original";
}

export default function tmdbImageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  const m = TMDB_PATH.exec(src);
  if (!m) return src;
  return `https://image.tmdb.org/t/p/${tmdbSizeFor(width)}${m[1]}`;
}
