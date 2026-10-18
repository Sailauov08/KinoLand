// Usage: npm run admin:promote -- user@example.com
// Grants the admin role to an existing account in the local SQLite database.
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run admin:promote -- <email>");
  process.exit(1);
}
const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "kino.db");
const db = new DatabaseSync(file);
const res = db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);
if (res.changes === 0) {
  console.error(`No account found for ${email}. Register in the app first.`);
  process.exit(1);
}
console.log(`${email} is now an administrator.`);
