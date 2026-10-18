/** Date-range handling for admin analytics (pure, unit tested). Days are calendar days in `tz`. */
import { addDaysToKey, dayKeyInTz, startOfDayInTz } from "@/lib/time";

export const RANGES = ["7d", "30d", "90d", "365d"] as const;
export type RangeKey = (typeof RANGES)[number];

const DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };

export function parseRange(raw: unknown): RangeKey {
  return RANGES.includes(raw as RangeKey) ? (raw as RangeKey) : "30d";
}

/** Range ending now, starting at local midnight `days - 1` days ago (in `tz`). */
export function rangeBounds(key: RangeKey, tz: string, now = Date.now()): { from: number; to: number; days: number } {
  const days = DAYS[key];
  return { from: startOfDayInTz(now, tz, days - 1), to: now, days };
}

/** Expands sparse `{ day, ... }` rows into one entry per day (missing days = 0). */
export function fillDays<T extends { day: string }>(
  rows: T[],
  from: number,
  days: number,
  pick: (row: T | undefined) => number,
  tz: string,
): { day: string; value: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const first = dayKeyInTz(from, tz);
  return Array.from({ length: days }, (_, i) => {
    const key = addDaysToKey(first, i);
    return { day: key, value: pick(byDay.get(key)) };
  });
}
