// Usage: npm run admin:promote -- user@example.com
// One-time, server-side bootstrap of an administrator. Requires shell access to the server, so it
// cannot be triggered by website visitors. The account must already exist (register in the app first).
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run admin:promote -- <email>");
  process.exit(1);
}
const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "kino.db");
const db = new DatabaseSync(file);
const user = db.prepare("SELECT id, role FROM users WHERE email = ?").get(email);
if (!user) {
  console.error(`No account found for ${email}. Register in the app first.`);
  process.exit(1);
}
db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
try {
  db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(user.id);
  db.prepare("INSERT INTO audit_log (created_at, actor_id, action, target_type, target_id, details) VALUES (?, NULL, 'user.grant_admin', 'user', ?, ?)").run(
    Date.now(),
    user.id,
    JSON.stringify({ via: "cli" }),
  );
} catch {
  // Database not yet migrated to v2 (start the app once); the role change above still applies.
}
console.log(user.role === "admin" ? `${email} was already an administrator.` : `${email} is now an administrator.`);
