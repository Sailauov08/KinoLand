import type { Locale } from "./config";
import { en, type Dictionary, type TKey } from "./dictionaries/en";
import { kk } from "./dictionaries/kk";
import { ru } from "./dictionaries/ru";

export type { Dictionary, TKey };

export const dictionaries: Record<Locale, Dictionary> = { en, ru, kk };

export type TVars = Record<string, string | number>;
export type TFunction = (key: TKey, vars?: TVars) => string;

export function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export function createTranslator(dict: Dictionary): TFunction {
  return (key, vars) => interpolate(dict[key] ?? en[key] ?? key, vars);
}
