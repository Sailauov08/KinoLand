"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  addCollectionItem,
  createCollection,
  deleteCollection,
  getCollectionById,
  moveCollectionItem,
  removeCollectionItem,
  slugExists,
  updateCollection,
} from "@/lib/db/collections";
import { setSpotlight } from "@/lib/db/settings";
import { countAdmins, findUserById, setUserRole } from "@/lib/db/users";
import { getLocale } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { parseFilters } from "@/lib/movies/filters";
import { getMovie, searchMovies } from "@/lib/movies/service";
import { toSnapshot, type MovieSummary, type UnavailableReason } from "@/lib/movies/types";
import { collectionSchema, fieldErrors, movieIdSchema, spotlightInputSchema } from "@/lib/validation";
import type { FormState } from "./types";

/** Every admin action re-checks the role server-side; UI visibility is not authorisation. */
async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Forbidden");
  return user;
}

const idSchema = z.coerce.number().int().positive();

function revalidateEditorial(slug?: string) {
  revalidatePath("/");
  revalidatePath("/collections");
  if (slug) revalidatePath(`/collections/${slug}`);
  revalidatePath("/admin");
}

export async function saveCollectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const parsed = collectionSchema.safeParse({
    slug: formData.get("slug"),
    title: { en: formData.get("title_en"), ru: formData.get("title_ru") ?? "", kk: formData.get("title_kk") ?? "" },
    description: {
      en: formData.get("description_en") ?? "",
      ru: formData.get("description_ru") ?? "",
      kk: formData.get("description_kk") ?? "",
    },
    isPublished: formData.get("isPublished") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    position: formData.get("position") || 0,
  });
  if (!parsed.success) return { error: "auth.invalidInput", fields: fieldErrors(parsed.error) };

  const rawId = formData.get("id");
  const id = rawId ? idSchema.safeParse(rawId) : null;
  if (id && !id.success) return { error: "auth.invalidInput" };
  const existingId = id?.data;

  if (slugExists(parsed.data.slug, existingId)) return { error: "admin.slugTaken", fields: { slug: true } };

  if (existingId) {
    const before = getCollectionById(existingId);
    if (!before) return { error: "auth.invalidInput" };
    updateCollection(existingId, parsed.data);
    logger.info("admin.collection_updated", { adminId: admin.id, collectionId: existingId });
    revalidateEditorial(before.slug);
    revalidateEditorial(parsed.data.slug);
    return { ok: true, message: "admin.saved" };
  }
  const newId = createCollection(parsed.data);
  logger.info("admin.collection_created", { adminId: admin.id, collectionId: newId });
  revalidateEditorial(parsed.data.slug);
  redirect(`/admin/collections/${newId}`);
}

export async function deleteCollectionAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = idSchema.parse(formData.get("id"));
  const c = getCollectionById(id);
  deleteCollection(id);
  logger.info("admin.collection_deleted", { adminId: admin.id, collectionId: id });
  revalidateEditorial(c?.slug);
  redirect("/admin");
}

export async function addCollectionItemAction(rawCollectionId: unknown, rawMovieId: unknown): Promise<{ ok: boolean }> {
  await assertAdmin();
  const collectionId = idSchema.parse(rawCollectionId);
  const movieId = movieIdSchema.parse(rawMovieId);
  const c = getCollectionById(collectionId);
  if (!c) return { ok: false };
  const res = await getMovie(movieId, "en");
  if (!res.ok || !res.data) return { ok: false };
  addCollectionItem(collectionId, toSnapshot(res.data));
  revalidateEditorial(c.slug);
  revalidatePath(`/admin/collections/${collectionId}`);
  return { ok: true };
}

export async function removeCollectionItemAction(formData: FormData) {
  await assertAdmin();
  const collectionId = idSchema.parse(formData.get("collectionId"));
  const movieId = movieIdSchema.parse(formData.get("movieId"));
  removeCollectionItem(collectionId, movieId);
  revalidateEditorial(getCollectionById(collectionId)?.slug);
  revalidatePath(`/admin/collections/${collectionId}`);
}

export async function moveCollectionItemAction(formData: FormData) {
  await assertAdmin();
  const collectionId = idSchema.parse(formData.get("collectionId"));
  const movieId = movieIdSchema.parse(formData.get("movieId"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));
  moveCollectionItem(collectionId, movieId, direction);
  revalidateEditorial(getCollectionById(collectionId)?.slug);
  revalidatePath(`/admin/collections/${collectionId}`);
}

/** Title search used by the admin movie picker. */
export async function adminSearchAction(query: unknown): Promise<{ results: MovieSummary[]; unavailable?: UnavailableReason }> {
  await assertAdmin();
  const q = z.string().trim().min(1).max(100).safeParse(query);
  if (!q.success) return { results: [] };
  const res = await searchMovies(parseFilters({ q: q.data }), await getLocale());
  if (!res.ok) return { results: [], unavailable: res.reason };
  return { results: res.data.results.slice(0, 12) };
}

export async function saveSpotlightAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const parsed = spotlightInputSchema.safeParse({
    movieId: formData.get("movieId"),
    tagline: { en: formData.get("tagline_en") ?? "", ru: formData.get("tagline_ru") ?? "", kk: formData.get("tagline_kk") ?? "" },
  });
  if (!parsed.success) return { error: "auth.invalidInput", fields: fieldErrors(parsed.error) };
  const movie = await getMovie(parsed.data.movieId, "en");
  if (!movie.ok) return { error: "unavailable.title" };
  if (!movie.data) return { error: "admin.notFoundMovie", fields: { movieId: true } };
  setSpotlight(parsed.data);
  logger.info("admin.spotlight_set", { adminId: admin.id, movieId: parsed.data.movieId });
  revalidateEditorial();
  return { ok: true, message: "admin.saved" };
}

export async function clearSpotlightAction() {
  await assertAdmin();
  setSpotlight(null);
  revalidateEditorial();
}

export async function setRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const userId = z.string().uuid().safeParse(formData.get("userId"));
  const role = z.enum(["user", "admin"]).safeParse(formData.get("role"));
  if (!userId.success || !role.success) return { error: "auth.invalidInput" };
  const target = findUserById(userId.data);
  if (!target) return { error: "auth.invalidInput" };
  if (role.data === "user" && target.role === "admin" && countAdmins() <= 1) return { error: "admin.lastAdmin" };
  setUserRole(target.id, role.data);
  logger.info("admin.role_changed", { adminId: admin.id, userId: target.id, role: role.data });
  revalidatePath("/admin/users");
  return { ok: true, message: "admin.saved" };
}
