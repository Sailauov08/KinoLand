const IMAGE_BASE = "https://image.tmdb.org/t/p";

/**
 * Canonical TMDB image URL for next/image. The size segment is only a default — the custom loader
 * (tmdb-image-loader.ts) rewrites it per srcset width. "original" keeps the canonical src distinct
 * from every sized rendition (Next's dev check expects the loader output to differ from src). Returns null for missing/invalid paths so
 * callers can render a placeholder.
 */
export function tmdbImage(path: string | null | undefined, size: "w185" | "w342" | "w500" | "w780" | "w1280" | "original" = "original"): string | null {
  if (!path || !/^\/[\w.-]+\.(jpe?g|png|webp|svg)$/i.test(path)) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}
