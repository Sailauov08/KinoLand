// Usage: npm run db:migrate   — creates/updates the KinoLand schema (safe to run repeatedly).
import { connect, migrate } from "./_db.mjs";

const { db, target, close } = await connect();
try {
  const ran = await migrate(db);
  console.log(`Target: ${target}`);
  console.log(ran.length ? `Applied migrations: ${ran.join(", ")}` : "Schema is up to date.");
} finally {
  await close();
}
