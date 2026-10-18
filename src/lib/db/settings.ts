import "server-only";
import { z } from "zod";
import { one, q } from "./index";

async function readSetting(key: string): Promise<unknown> {
  return (await one<{ value: unknown }>("SELECT value FROM kinoland.settings WHERE key = $1", [key]))?.value;
}

async function writeSetting(key: string, value: unknown) {
  await q("INSERT INTO kinoland.settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [key, JSON.stringify(value)]);
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

export async function getDisplaySettings(): Promise<DisplaySettings> {
  const parsed = displaySettingsSchema.safeParse((await readSetting("display")) ?? {});
  return parsed.success ? parsed.data : displaySettingsSchema.parse({});
}

export const setDisplaySettings = (value: DisplaySettings) => writeSetting("display", value);

/** How long first-party analytics events are kept (days). */
export async function getRetentionDays(): Promise<number> {
  const v = z.number().int().min(7).max(730).safeParse(await readSetting("analytics_retention_days"));
  return v.success ? v.data : 180;
}

export const setRetentionDays = (days: number) => writeSetting("analytics_retention_days", days);
