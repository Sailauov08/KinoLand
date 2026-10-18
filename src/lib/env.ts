import "server-only";
import { z } from "zod";

const envSchema = z.object({
  TMDB_READ_ACCESS_TOKEN: z.string().trim().optional(),
  TMDB_API_KEY: z.string().trim().optional(),
  DATABASE_PATH: z.string().trim().optional(),
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

export const env = {
  tmdbToken: parsed.TMDB_READ_ACCESS_TOKEN || undefined,
  tmdbApiKey: parsed.TMDB_API_KEY || undefined,
  databasePath: parsed.DATABASE_PATH || undefined,
  posthogKey: parsed.POSTHOG_PROJECT_API_KEY || undefined,
  posthogHost: (parsed.POSTHOG_HOST || "https://eu.i.posthog.com").replace(/\/$/, ""),
  posthogPersonalKey: parsed.POSTHOG_PERSONAL_API_KEY || undefined,
  posthogProjectId: parsed.POSTHOG_PROJECT_ID || undefined,
  isProduction: parsed.NODE_ENV === "production",
};

export const isTmdbConfigured = () => Boolean(env.tmdbToken || env.tmdbApiKey);
export const isPosthogConfigured = () => Boolean(env.posthogKey);
export const isPosthogQueryConfigured = () => Boolean(env.posthogKey && env.posthogPersonalKey && env.posthogProjectId);
