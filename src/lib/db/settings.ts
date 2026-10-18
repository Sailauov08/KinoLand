import "server-only";
import { z } from "zod";
import { getDb } from "./index";

function readSetting(key: string): unknown {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  if (!row) return undefined;
  try {
    return JSON.parse(row.value);
  } catch {
    return undefined;
  }
}

function writeSetting(key: string, value: unknown) {
  getDb()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, JSON.stringify(value));
}

/** Which homepage sections are shown. Defaults keep the current layout. */
export const displaySettingsSchema = z.object({
  showTrending: z.boolean().default(true),
  showTopRated: z.boolean().default(true),
  showNowPlaying: z.boolean().default(true),
  showUpcoming: z.boolean().default(true),
  showGenreMoods: z.boolean().default(true),
  showPersonalized: z.boolean().default(true),
});
export type DisplaySettings = z.infer<typeof displaySettingsSchema>;

export function getDisplaySettings(): DisplaySettings {
  const parsed = displaySettingsSchema.safeParse(readSetting("display") ?? {});
  return parsed.success ? parsed.data : displaySettingsSchema.parse({});
}

export function setDisplaySettings(value: DisplaySettings) {
  writeSetting("display", value);
}

/** How long first-party analytics events are kept (days). */
export function getRetentionDays(): number {
  const v = z.number().int().min(7).max(730).safeParse(readSetting("analytics_retention_days"));
  return v.success ? v.data : 180;
}

export function setRetentionDays(days: number) {
  writeSetting("analytics_retention_days", days);
}
