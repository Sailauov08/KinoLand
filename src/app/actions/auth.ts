"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createSession, destroySession, safeNextPath } from "@/lib/auth/session";
import { createUser, findUserByEmail, setUserRole } from "@/lib/db/users";
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

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const values = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { error: "auth.invalidInput", fields: fieldErrors(parsed.error), values };
  const { name, email, password } = parsed.data;

  if (!rateLimit(`register:${await clientKey("")}`, 10, 60 * 60 * 1000)) return { error: "auth.rateLimited", values };
  if (findUserByEmail(email)) return { error: "auth.emailTaken", fields: { email: true }, values };

  const locale = await getLocale();
  const user = createUser({
    email,
    name,
    passwordHash: await hashPassword(password),
    role: env.adminEmails.has(email) ? "admin" : "user",
    locale,
  });
  logger.info("auth.registered", { userId: user.id, role: user.role });
  await createSession(user.id);
  redirect(safeNextPath(formData.get("next")));
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { error: "auth.invalidInput", fields: fieldErrors(parsed.error), values };
  const { email, password } = parsed.data;

  if (!rateLimit(`login:${await clientKey(email)}`, 8, 60 * 1000)) return { error: "auth.rateLimited", values };

  const user = findUserByEmail(email);
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    logger.info("auth.login_failed");
    return { error: "auth.invalidCredentials", values };
  }
  // Promote configured admin emails on sign-in (lets ADMIN_EMAILS be set after registration).
  if (env.adminEmails.has(user.email) && user.role !== "admin") setUserRole(user.id, "admin");

  await createSession(user.id);
  await setLocaleCookie(user.locale);
  logger.info("auth.login", { userId: user.id });
  redirect(safeNextPath(formData.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
