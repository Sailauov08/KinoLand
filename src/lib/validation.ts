import { z } from "zod";
import { GENRE_IDS } from "./movies/genres";
import { locales } from "./i18n/config";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const passwordSchema = z.string().min(8).max(128);
export const nameSchema = z.string().trim().min(1).max(60);

export const registerSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });

export const genreListSchema = z
  .array(z.coerce.number().int())
  .transform((ids) => [...new Set(ids.filter((g) => GENRE_IDS.has(g)))].slice(0, 10));

export const profileSchema = z.object({
  name: nameSchema,
  locale: z.enum(locales),
  genres: genreListSchema,
});

export const changePasswordSchema = z.object({ current: z.string().min(1).max(128), next: passwordSchema });

export const movieIdSchema = z.coerce.number().int().positive().max(100_000_000);
export const listNameSchema = z.enum(["watchlist", "favorite"]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

export const collectionSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.object({ en: z.string().trim().min(1).max(120), ru: optionalText(120), kk: optionalText(120) }),
  description: z.object({ en: z.string().trim().max(600).default(""), ru: optionalText(600), kk: optionalText(600) }),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  position: z.coerce.number().int().min(0).max(999).default(0),
});

export const spotlightInputSchema = z.object({
  movieId: movieIdSchema,
  tagline: z.object({ en: z.string().trim().max(160).default(""), ru: optionalText(160), kk: optionalText(160) }),
});

/** Maps zod issues to the first failing field name → used to highlight form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, true> {
  const out: Record<string, true> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key) out[key] = true;
  }
  return out;
}
