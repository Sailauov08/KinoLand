import type { Locale } from "@/lib/i18n/config";

/** TMDB movie genre ids with interface translations (stable list from TMDB /genre/movie/list). */
export const GENRES: { id: number; name: Record<Locale, string> }[] = [
  { id: 28, name: { en: "Action", ru: "Боевик", kk: "Экшн" } },
  { id: 12, name: { en: "Adventure", ru: "Приключения", kk: "Шытырман оқиға" } },
  { id: 16, name: { en: "Animation", ru: "Мультфильм", kk: "Анимация" } },
  { id: 35, name: { en: "Comedy", ru: "Комедия", kk: "Комедия" } },
  { id: 80, name: { en: "Crime", ru: "Криминал", kk: "Қылмыс" } },
  { id: 99, name: { en: "Documentary", ru: "Документальный", kk: "Деректі" } },
  { id: 18, name: { en: "Drama", ru: "Драма", kk: "Драма" } },
  { id: 10751, name: { en: "Family", ru: "Семейный", kk: "Отбасылық" } },
  { id: 14, name: { en: "Fantasy", ru: "Фэнтези", kk: "Фэнтези" } },
  { id: 36, name: { en: "History", ru: "История", kk: "Тарихи" } },
  { id: 27, name: { en: "Horror", ru: "Ужасы", kk: "Қорқынышты" } },
  { id: 10402, name: { en: "Music", ru: "Музыка", kk: "Музыка" } },
  { id: 9648, name: { en: "Mystery", ru: "Детектив", kk: "Құпия" } },
  { id: 10749, name: { en: "Romance", ru: "Мелодрама", kk: "Мелодрама" } },
  { id: 878, name: { en: "Science Fiction", ru: "Фантастика", kk: "Ғылыми фантастика" } },
  { id: 10770, name: { en: "TV Movie", ru: "Телефильм", kk: "Телефильм" } },
  { id: 53, name: { en: "Thriller", ru: "Триллер", kk: "Триллер" } },
  { id: 10752, name: { en: "War", ru: "Военный", kk: "Соғыс" } },
  { id: 37, name: { en: "Western", ru: "Вестерн", kk: "Вестерн" } },
];

export const GENRE_IDS = new Set(GENRES.map((g) => g.id));

export function genreName(id: number, locale: Locale): string | null {
  return GENRES.find((g) => g.id === id)?.name[locale] ?? null;
}

export function genreOptions(locale: Locale) {
  return GENRES.filter((g) => g.id !== 10770)
    .map((g) => ({ id: g.id, name: g.name[locale] }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Original languages offered in filters (ISO 639-1). */
export const FILTER_LANGUAGES = [
  "en", "ru", "kk", "fr", "es", "de", "it", "ja", "ko", "zh", "hi", "tr", "sv", "da", "pt", "fa",
] as const;

export function languageLabel(code: string, locale: Locale): string {
  try {
    const dn = new Intl.DisplayNames([locale, "en"], { type: "language" });
    const label = dn.of(code);
    if (label && label !== code) return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
  } catch {
    /* fall through */
  }
  return code.toUpperCase();
}
