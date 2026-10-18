import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { isLocale, LOCALE_COOKIE, matchAcceptLanguage, type Locale } from "./config";
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
