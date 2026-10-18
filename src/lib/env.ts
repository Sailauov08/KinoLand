import "server-only";
import { z } from "zod";

const envSchema = z.object({
  TMDB_READ_ACCESS_TOKEN: z.string().trim().optional(),
  TMDB_API_KEY: z.string().trim().optional(),
  // PostgreSQL connection string (Supabase). Required in production.
  DATABASE_URL: z.string().trim().optional(),
  // Optional PEM CA certificate to verify the database server certificate (Supabase → SSL certificate).
  DATABASE_CA_CERT: z.string().trim().optional(),
  // Embedded PGlite database used when DATABASE_URL is unset (local dev/tests): a directory or "memory".
  EMBEDDED_DB_DIR: z.string().trim().optional(),
  ALLOW_EMBEDDED_DB: z.string().trim().optional(),
  // Time zone used for daily statistics (servers like Vercel run in UTC).
  APP_TIMEZONE: z.string().trim().optional(),
  // Optional PostHog product analytics. Events are forwarded server-side, only after visitor consent;
  // no PostHog script or key is sent to browsers.
  POSTHOG_PROJECT_API_KEY: z.string().trim().optional(),
  POSTHOG_HOST: z.string().trim().url().optional(),
  // Optional server-only credentials for showing PostHog numbers in the admin dashboard.
  POSTHOG_PERSONAL_API_KEY: z.string().trim().optional(),
  POSTHOG_PROJECT_ID: z.string().trim().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.parse(process.env);

function validTimeZone(tz: string | undefined): string | undefined {
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

export const env = {
  tmdbToken: parsed.TMDB_READ_ACCESS_TOKEN || undefined,
  tmdbApiKey: parsed.TMDB_API_KEY || undefined,
  databaseUrl: parsed.DATABASE_URL || undefined,
  // Env vars often store PEM certificates with literal "\n" sequences; turn them back into newlines.
  databaseCaCert: parsed.DATABASE_CA_CERT?.replace(/\\n/g, "\n") || undefined,
  embeddedDbDir: parsed.EMBEDDED_DB_DIR === "memory" ? undefined : parsed.EMBEDDED_DB_DIR || "data/pglite",
  allowEmbeddedDb: parsed.ALLOW_EMBEDDED_DB === "1",
  appTimezone: validTimeZone(parsed.APP_TIMEZONE) ?? "Asia/Almaty",
  posthogKey: parsed.POSTHOG_PROJECT_API_KEY || undefined,
  posthogHost: (parsed.POSTHOG_HOST || "https://eu.i.posthog.com").replace(/\/$/, ""),
  posthogPersonalKey: parsed.POSTHOG_PERSONAL_API_KEY || undefined,
  posthogProjectId: parsed.POSTHOG_PROJECT_ID || undefined,
  isProduction: parsed.NODE_ENV === "production",
};

export const isTmdbConfigured = () => Boolean(env.tmdbToken || env.tmdbApiKey);
export const isPosthogConfigured = () => Boolean(env.posthogKey);
export const isDatabaseConfigured = () => Boolean(env.databaseUrl);
export const isPosthogQueryConfigured = () => Boolean(env.posthogKey && env.posthogPersonalKey && env.posthogProjectId);
