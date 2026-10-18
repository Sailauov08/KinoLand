type Level = "info" | "warn" | "error";

/** Errors and TMDB outages are also persisted to the error_log table (server only) for the admin dashboard. */
function persist(level: Level, event: string, fields: Record<string, unknown>) {
  if (typeof window !== "undefined") return;
  if (level !== "error" && !(level === "warn" && event.startsWith("tmdb."))) return;
  const message = typeof fields.error === "string" ? fields.error : typeof fields.hint === "string" ? fields.hint : null;
  void import("@/lib/db/errors")
    .then((m) => m.recordError({ source: "server", event, message, path: typeof fields.path === "string" ? fields.path : null }))
    .catch(() => {});
}

/** Minimal structured (JSON-line) logger. Never pass secrets or raw credentials in `fields`. */
function log(level: Level, event: string, fields: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "test") return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
  persist(level, event, fields);
}

export const logger = {
  info: (event: string, fields?: Record<string, unknown>) => log("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => log("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => log("error", event, fields),
};
