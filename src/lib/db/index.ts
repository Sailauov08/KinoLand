import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { env } from "@/lib/env";
import { migrate } from "./migrations";

const globalForDb = globalThis as unknown as { kinoDb?: DatabaseSync };

function open(): DatabaseSync {
  const file = env.databasePath ?? path.join(process.cwd(), "data", "kino.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  migrate(db);
  return db;
}

/** Process-wide SQLite connection (reused across dev hot reloads). */
export function getDb(): DatabaseSync {
  if (!globalForDb.kinoDb) globalForDb.kinoDb = open();
  return globalForDb.kinoDb;
}
