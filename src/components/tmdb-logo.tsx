/* eslint-disable @next/next/no-img-element -- official TMDB SVG served from TMDB; no optimisation needed */

/** Official TMDB "alt short" logo, loaded unmodified from TMDB as their attribution terms require. */
export const TMDB_LOGO_URL =
  "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg";

export function TmdbLogo({ height = 12, className }: { height?: number; className?: string }) {
  // Native aspect ratio of the asset is ~7.6:1.
  return <img src={TMDB_LOGO_URL} alt="The Movie Database (TMDB)" height={height} width={Math.round(height * 7.6)} className={className} loading="lazy" />;
}
