import "server-only";
import { z } from "zod";
import { getDb } from "./index";

const spotlightSchema = z.object({
  movieId: z.number().int().positive(),
  tagline: z.object({ en: z.string(), ru: z.string().optional(), kk: z.string().optional() }),
});

/** Editorial hero ("spotlight") chosen by admins for the homepage. */
export type Spotlight = z.infer<typeof spotlightSchema>;

export function getSpotlight(): Spotlight | null {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = 'spotlight'").get() as { value: string } | undefined;
  if (!row) return null;
  try {
    const parsed = spotlightSchema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function setSpotlight(value: Spotlight | null) {
  const db = getDb();
  if (!value) db.prepare("DELETE FROM settings WHERE key = 'spotlight'").run();
  else
    db.prepare("INSERT INTO settings (key, value) VALUES ('spotlight', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
      JSON.stringify(value),
    );
}
