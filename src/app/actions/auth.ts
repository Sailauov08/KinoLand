"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { trackServer } from "@/lib/analytics/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { rateLimitShared } from "@/lib/auth/rate-limit";
import { createSession, destroySession, safeNextPath } from "@/lib/auth/session";
import { createUser, findUserByEmail } from "@/lib/db/users";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { fieldErrors, loginSchema, registerSchema } from "@/lib/validation";
import type { FormState } from "./types";

// Used to equalise timing when the email doesn't exist.
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

async function clientKey(email: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return `${ip}:${email}`;
}

async function setLocaleCookie(locale: string | null) {
  if (!locale) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

/** Public registration always creates a regular user — there is no way to self-register as admin. */
export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const values = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { error: "auth.invalidInput", fields: fieldErrors(parsed.error), values };
  const { name, email, password } = parsed.data;

  if (!(await rateLimitShared(`register:${await clientKey("")}`, 10, 60 * 60 * 1000))) return { error: "auth.rateLimited", values };
  if (await findUserByEmail(email)) return { error: "auth.emailTaken", fields: { email: true }, values };

  const user = await createUser({ email, name, passwordHash: await hashPassword(password), locale: await getLocale() });
  logger.info("auth.registered", { userId: user.id });
  await createSession(user.id);
  await trackServer("signup_success", { userId: user.id });
  redirect(safeNextPath(formData.get("next")));
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { error: "auth.invalidInput", fields: fieldErrors(parsed.error), values };
  const { email, password } = parsed.data;

  if (!(await rateLimitShared(`login:${await clientKey(email)}`, 8, 60 * 1000))) return { error: "auth.rateLimited", values };

  const user = await findUserByEmail(email);
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    logger.info("auth.login_failed");
    return { error: "auth.invalidCredentials", values };
  }
  if (user.status !== "active") {
    logger.info("auth.login_suspended", { userId: user.id });
    return { error: "auth.suspended", values };
  }

  await createSession(user.id);
  await setLocaleCookie(user.locale);
  logger.info("auth.login", { userId: user.id });
  await trackServer("login_success", { userId: user.id });
  redirect(safeNextPath(formData.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
