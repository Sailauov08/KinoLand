// Usage: npm run admin:promote -- user@example.com
// One-time, server-side bootstrap of an administrator. Requires the database credentials (shell
// access), so it cannot be triggered by website visitors. The account must already exist.
import { connect, migrate } from "./_db.mjs";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run admin:promote -- <email>");
  process.exit(1);
}
const { db, target, close } = await connect();
try {
  await migrate(db);
  const [user] = await db.query("SELECT id, role FROM kinoland.users WHERE email = $1", [email]);
  if (!user) {
    console.error(`No account found for ${email} in ${target}. Register in the app first.`);
    process.exitCode = 1;
  } else {
    await db.query("UPDATE kinoland.users SET role = 'admin', status = 'active' WHERE id = $1", [user.id]);
    await db.query(
      "INSERT INTO kinoland.audit_log (created_at, actor_id, action, target_type, target_id, details) VALUES ($1, NULL, 'user.grant_admin', 'user', $2, $3::jsonb)",
      [Date.now(), user.id, JSON.stringify({ via: "cli" })],
    );
    console.log(user.role === "admin" ? `${email} was already an administrator (${target}).` : `${email} is now an administrator (${target}).`);
  }
} finally {
  await close();
}
