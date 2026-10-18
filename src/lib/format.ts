import { localeTags, type Locale } from "./i18n/config";
import type { TFunction } from "./i18n/translate";

export function formatRuntime(minutes: number | null, t: TFunction): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? t("movie.runtimeValue", { h, m }) : t("movie.runtimeMinutes", { m });
}

export function formatRating(value: number | null): string | null {
  return value === null ? null : value.toFixed(1);
}

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTags[locale]).format(n);
}

export function formatDate(input: number | string, locale: Locale): string {
  const d = typeof input === "number" ? new Date(input) : new Date(input);
  return new Intl.DateTimeFormat(localeTags[locale], { year: "numeric", month: "long", day: "numeric" }).format(d);
}
