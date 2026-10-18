"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentUser, revokeOtherSessions } from "@/lib/auth/session";
import { getPasswordHash, updatePasswordHash, updateUserLocale, updateUserProfile } from "@/lib/db/users";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { changePasswordSchema, fieldErrors, profileSchema } from "@/lib/validation";
import type { FormState } from "./types";

const LOCALE_COOKIE_OPTS = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };

/** Switches interface language for anyone; persists it on the profile when signed in. */
export async function setLocaleAction(locale: unknown) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTS);
  const user = await getCurrentUser();
  if (user) updateUserLocale(user.id, locale);
  revalidatePath("/", "layout");
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "list.signInToSave" };
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    locale: formData.get("locale"),
    genres: formData.getAll("genres"),
  });
  if (!parsed.success) return { error: "auth.invalidInput", fields: fieldErrors(parsed.error) };
  updateUserProfile(user.id, { name: parsed.data.name, preferredGenres: parsed.data.genres, locale: parsed.data.locale });
  (await cookies()).set(LOCALE_COOKIE, parsed.data.locale, LOCALE_COOKIE_OPTS);
  revalidatePath("/", "layout");
  return { ok: true, message: "profile.saved" };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "list.signInToSave" };
  const parsed = changePasswordSchema.safeParse({ current: formData.get("current"), next: formData.get("next") });
  if (!parsed.success) return { error: "auth.invalidInput", fields: fieldErrors(parsed.error) };
  const stored = getPasswordHash(user.id);
  if (!stored || !(await verifyPassword(parsed.data.current, stored))) {
    return { error: "profile.wrongPassword", fields: { current: true } };
  }
  updatePasswordHash(user.id, await hashPassword(parsed.data.next));
  await revokeOtherSessions(user.id);
  return { ok: true, message: "profile.passwordUpdated" };
}
