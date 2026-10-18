/** Time-zone aware day helpers (pure; servers such as Vercel run in UTC). */

const formatters = new Map<string, Intl.DateTimeFormat>();
function parts(ts: number, tz: string) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    formatters.set(tz, f);
  }
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(new Date(ts))) if (p.type !== "literal") o[p.type] = Number(p.value);
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Calendar day ("YYYY-MM-DD") of a timestamp in the given time zone. */
export function dayKeyInTz(ts: number, tz: string): string {
  const p = parts(ts, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Offset of `tz` from UTC at instant `ts`, in ms. */
function offsetMs(ts: number, tz: string): number {
  const p = parts(ts, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ts / 1000) * 1000;
}

/** Epoch ms of local midnight (in `tz`) of the day `daysAgo` days before the day containing `ts`. */
export function startOfDayInTz(ts: number, tz: string, daysAgo = 0): number {
  const [y, m, d] = dayKeyInTz(ts, tz).split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d - daysAgo);
  return utcMidnight - offsetMs(utcMidnight, tz);
}

/** Adds whole days to a "YYYY-MM-DD" key. */
export function addDaysToKey(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
