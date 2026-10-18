import "server-only";
import { z } from "zod";

const envSchema = z.object({
  TMDB_READ_ACCESS_TOKEN: z.string().trim().optional(),
  TMDB_API_KEY: z.string().trim().optional(),
  ADMIN_EMAILS: z.string().optional(),
  DATABASE_PATH: z.string().trim().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.parse(process.env);

export const env = {
  tmdbToken: parsed.TMDB_READ_ACCESS_TOKEN || undefined,
  tmdbApiKey: parsed.TMDB_API_KEY || undefined,
  adminEmails: new Set(
    (parsed.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  ),
  databasePath: parsed.DATABASE_PATH || undefined,
  isProduction: parsed.NODE_ENV === "production",
};

export const isTmdbConfigured = () => Boolean(env.tmdbToken || env.tmdbApiKey);
