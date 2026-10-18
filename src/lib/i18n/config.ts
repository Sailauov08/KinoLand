export const locales = ["en", "ru", "kk"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "kino_locale";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  kk: "Қазақша",
};

/** BCP-47 tags used for TMDB requests and Intl formatting. */
export const localeTags: Record<Locale, string> = {
  en: "en-US",
  ru: "ru-RU",
  kk: "kk-KZ",
};

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (locales as readonly string[]).includes(value);

/** Picks the best supported locale from an Accept-Language header. */
export function matchAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return defaultLocale;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((x) => x.tag && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}
