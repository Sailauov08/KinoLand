/** Date-range handling for admin analytics (pure, unit tested). */
export const RANGES = ["7d", "30d", "90d", "365d"] as const;
export type RangeKey = (typeof RANGES)[number];

const DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };

export function parseRange(raw: unknown): RangeKey {
  return RANGES.includes(raw as RangeKey) ? (raw as RangeKey) : "30d";
}

/** Inclusive range ending now, starting at local midnight `days - 1` days ago. */
export function rangeBounds(key: RangeKey, now = Date.now()): { from: number; to: number; days: number } {
  const days = DAYS[key];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return { from: start.getTime(), to: now, days };
}

export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Expands sparse `{ day, value }` rows into one entry per day (missing days = 0). */
export function fillDays<T extends { day: string }>(rows: T[], from: number, days: number, pick: (row: T | undefined) => number): { day: string; value: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: { day: string; value: number }[] = [];
  const cursor = new Date(from);
  for (let i = 0; i < days; i++) {
    const key = localDayKey(cursor);
    out.push({ day: key, value: pick(byDay.get(key)) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
