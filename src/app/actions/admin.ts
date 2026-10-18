"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ForbiddenError } from "@/lib/auth/admin-guard";
import { getCurrentUser, revokeAllSessions } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import { deleteBanner, deleteProviderLink, getBanner, hideMovie, saveBanner, unhideMovie, upsertProviderLink } from "@/lib/db/content";
import { deleteEventsBefore } from "@/lib/db/events";
import { displaySettingsSchema, setDisplaySettings, setRetentionDays } from "@/lib/db/settings";
import { countActiveAdmins, findUserById, setUserRole, setUserStatus } from "@/lib/db/users";
import type { AdminKey } from "@/lib/i18n/admin";
import { logger } from "@/lib/logger";
import { getMovie } from "@/lib/movies/service";
import { movieIdSchema } from "@/lib/validation";

export interface AdminFormState {
  ok?: boolean;
  error?: AdminKey;
  message?: AdminKey;
  vars?: Record<string, string | number>;
  fields?: Record<string, true>;
}

/** Re-verifies the session and admin role from the database on every call. */
async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    logger.warn("admin.forbidden_action", { userId: user?.id ?? null });
    throw new ForbiddenError();
  }
  return user;
}

const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const localizedText = (max: number) => z.object({ en: text(max), ru: text(max), kk: text(max) });
const read = (fd: FormData, key: string) => (fd.get(key) ?? "").toString();

/* ── Users ─────────────────────────────────────────────────────────────── */

export async function setUserStatusAction(_prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await assertAdmin();
  const userId = uuid.safeParse(fd.get("userId"));
  const status = z.enum(["active", "suspended"]).safeParse(fd.get("status"));
  if (!userId.success || !status.success) return { error: "action.invalid" };
  if (userId.data === admin.id) return { error: "action.self" };
  const target = await findUserById(userId.data);
  if (!target) return { error: "action.invalid" };
  if (status.data === "suspended" && target.role === "admin" && target.status === "active" && await countActiveAdmins() <= 1) return { error: "action.lastAdmin" };

  await setUserStatus(target.id, status.data);
  const revoked = status.data === "suspended" ? await revokeAllSessions(target.id) : 0;
  await logAudit({ actorId: admin.id, action: status.data === "suspended" ? "user.suspend" : "user.reactivate", targetType: "user", targetId: target.id, details: { revokedSessions: revoked } });
  revalidatePath("/admin/users", "layout");
  return { ok: true, message: "action.saved" };
}

export async function setUserRoleAction(_prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await assertAdmin();
  const userId = uuid.safeParse(fd.get("userId"));
  const role = z.enum(["user", "admin"]).safeParse(fd.get("role"));
  if (!userId.success || !role.success) return { error: "action.invalid" };
  if (userId.data === admin.id) return { error: "action.self" };
  const target = await findUserById(userId.data);
  if (!target) return { error: "action.invalid" };
  if (role.data === "user" && target.role === "admin" && target.status === "active" && await countActiveAdmins() <= 1) return { error: "action.lastAdmin" };

  await setUserRole(target.id, role.data);
  await logAudit({ actorId: admin.id, action: role.data === "admin" ? "user.grant_admin" : "user.revoke_admin", targetType: "user", targetId: target.id });
  revalidatePath("/admin/users", "layout");
  return { ok: true, message: "action.saved" };
}

/* ── Content: banners ─────────────────────────────────────────────────── */

async function verifyMovie(movieId: number): Promise<AdminKey | null> {
  const res = await getMovie(movieId, "en");
  if (!res.ok) return "content.movieUnavailable";
  return res.data ? null : "content.movieNotFound";
}

export async function saveBannerAction(_prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await assertAdmin();
  const parsed = z
    .object({
      id: z.coerce.number().int().positive().optional(),
      movieId: movieIdSchema,
      headline: localizedText(60),
      description: localizedText(200),
      isActive: z.boolean(),
      position: z.coerce.number().int().min(0).max(999),
    })
    .safeParse({
      id: read(fd, "id") || undefined,
      movieId: read(fd, "movieId"),
      headline: { en: read(fd, "headline_en"), ru: read(fd, "headline_ru"), kk: read(fd, "headline_kk") },
      description: { en: read(fd, "description_en"), ru: read(fd, "description_ru"), kk: read(fd, "description_kk") },
      isActive: fd.get("isActive") === "on",
      position: read(fd, "position") || 0,
    });
  if (!parsed.success) return { error: "action.invalid", fields: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), true as const])) };
  if (parsed.data.id && !await getBanner(parsed.data.id)) return { error: "action.invalid" };
  const movieError = await verifyMovie(parsed.data.movieId);
  if (movieError) return { error: movieError, fields: { movieId: true } };

  const id = await saveBanner(parsed.data);
  await logAudit({ actorId: admin.id, action: parsed.data.id ? "banner.update" : "banner.create", targetType: "banner", targetId: id, details: { movieId: parsed.data.movieId, active: parsed.data.isActive } });
  revalidatePath("/", "layout");
  return { ok: true, message: "action.saved" };
}

export async function deleteBannerAction(fd: FormData) {
  const admin = await assertAdmin();
  const id = z.coerce.number().int().positive().parse(fd.get("id"));
  await deleteBanner(id);
  await logAudit({ actorId: admin.id, action: "banner.delete", targetType: "banner", targetId: id });
  revalidatePath("/", "layout");
}

/* ── Content: visibility overrides ───────────────────────────────────── */

export async function hideMovieAction(_prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await assertAdmin();
  const movieId = movieIdSchema.safeParse(fd.get("movieId"));
  const reason = z.string().trim().max(200).safeParse(read(fd, "reason"));
  if (!movieId.success || !reason.success) return { error: "action.invalid", fields: { movieId: true } };
  await hideMovie(movieId.data, reason.data || null);
  await logAudit({ actorId: admin.id, action: "movie.hide", targetType: "movie", targetId: movieId.data, details: reason.data ? { reason: reason.data } : undefined });
  revalidatePath("/", "layout");
  return { ok: true, message: "action.saved" };
}

export async function unhideMovieAction(fd: FormData) {
  const admin = await assertAdmin();
  const movieId = movieIdSchema.parse(fd.get("movieId"));
  await unhideMovie(movieId);
  await logAudit({ actorId: admin.id, action: "movie.unhide", targetType: "movie", targetId: movieId });
  revalidatePath("/", "layout");
}

/* ── Content: approved provider links ────────────────────────────────── */

const providerUrl = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((u) => {
    try {
      const url = new URL(u);
      // Public https pages only: no plain http, credentials, IP literals or local hosts.
      return url.protocol === "https:" && !url.username && !url.password && url.hostname.includes(".") && !/^[\d.]+$|^\[/.test(url.hostname) && !/localhost$/i.test(url.hostname);
    } catch {
      return false;
    }
  });

export async function addProviderLinkAction(_prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await assertAdmin();
  const parsed = z
    .object({
      movieId: movieIdSchema,
      provider: z.string().trim().min(2).max(40),
      url: providerUrl,
      region: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional().or(z.literal("").transform(() => undefined)),
    })
    .safeParse({ movieId: read(fd, "movieId"), provider: read(fd, "provider"), url: read(fd, "url"), region: read(fd, "region") });
  if (!parsed.success) return { error: "action.invalid", fields: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), true as const])) };
  const movieError = await verifyMovie(parsed.data.movieId);
  if (movieError) return { error: movieError, fields: { movieId: true } };

  await upsertProviderLink({ ...parsed.data, region: parsed.data.region ?? null });
  await logAudit({ actorId: admin.id, action: "provider.upsert", targetType: "movie", targetId: parsed.data.movieId, details: { provider: parsed.data.provider, host: new URL(parsed.data.url).hostname } });
  revalidatePath(`/movie/${parsed.data.movieId}`);
  revalidatePath("/admin/content");
  return { ok: true, message: "action.saved" };
}

export async function deleteProviderLinkAction(fd: FormData) {
  const admin = await assertAdmin();
  const id = z.coerce.number().int().positive().parse(fd.get("id"));
  const removed = await deleteProviderLink(id);
  await logAudit({ actorId: admin.id, action: "provider.delete", targetType: "movie", targetId: removed?.movieId, details: removed ? { provider: removed.provider } : undefined });
  if (removed) revalidatePath(`/movie/${removed.movieId}`);
  revalidatePath("/admin/content");
}

/* ── Content: display settings ───────────────────────────────────────── */

export async function saveDisplaySettingsAction(_prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await assertAdmin();
  const keys = Object.keys(displaySettingsSchema.shape) as (keyof typeof displaySettingsSchema.shape)[];
  const value = displaySettingsSchema.parse(Object.fromEntries(keys.map((k) => [k, fd.get(k) === "on"])));
  await setDisplaySettings(value);
  await logAudit({ actorId: admin.id, action: "settings.display", details: value });
  revalidatePath("/", "layout");
  return { ok: true, message: "action.saved" };
}

/* ── Settings: analytics retention ───────────────────────────────────── */

export async function purgeEventsAction(_prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await assertAdmin();
  const days = z.coerce.number().int().min(7).max(730).safeParse(fd.get("days"));
  if (!days.success) return { error: "action.invalid", fields: { days: true } };
  await setRetentionDays(days.data);
  const deleted = await deleteEventsBefore(Date.now() - days.data * 86_400_000);
  await logAudit({ actorId: admin.id, action: "analytics.purge", details: { retentionDays: days.data, deleted } });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "action.purged", vars: { n: deleted } };
}
