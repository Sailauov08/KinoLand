const IMAGE_BASE = "https://image.tmdb.org/t/p";

export type PosterSize = "w185" | "w342" | "w500" | "w780";
export type BackdropSize = "w780" | "w1280" | "original";
export type ProfileSize = "w185" | "h632";

export function tmdbImage(path: string | null | undefined, size: PosterSize | BackdropSize | ProfileSize): string | null {
  if (!path || !path.startsWith("/")) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}
