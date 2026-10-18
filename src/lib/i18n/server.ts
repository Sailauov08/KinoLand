import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { isLocale, LOCALE_COOKIE, matchAcceptLanguage, type Locale } from "./config";
import { adminDictionaries, createAdminTranslator } from "./admin";
import { createTranslator, dictionaries } from "./translate";

/** Locale for this request: explicit cookie choice, else the browser's Accept-Language. */
export const getLocale = cache(async (): Promise<Locale> => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return matchAcceptLanguage((await headers()).get("accept-language"));
});

export const getT = cache(async () => {
  const locale = await getLocale();
  return { locale, t: createTranslator(dictionaries[locale]), dict: dictionaries[locale] };
});

/** Translator for the admin dashboard (separate dictionary from the public site). */
export const getAdminT = cache(async () => {
  const locale = await getLocale();
  return { locale, at: createAdminTranslator(adminDictionaries[locale]), adminDict: adminDictionaries[locale] };
});
