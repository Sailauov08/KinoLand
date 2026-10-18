import type { Locale } from "../config";
import { interpolate, type TVars } from "../translate";
import { adminEn, type AdminDictionary, type AdminKey } from "./en";
import { adminKk } from "./kk";
import { adminRu } from "./ru";

export type { AdminDictionary, AdminKey };

export const adminDictionaries: Record<Locale, AdminDictionary> = { en: adminEn, ru: adminRu, kk: adminKk };

export type AdminT = (key: AdminKey, vars?: TVars) => string;

export function createAdminTranslator(dict: AdminDictionary): AdminT {
  return (key, vars) => interpolate(dict[key] ?? adminEn[key] ?? key, vars);
}
