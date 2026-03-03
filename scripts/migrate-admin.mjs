import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log("Adding role column to users...");
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`;

  console.log("Adding created_at column to users...");
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`;

  console.log("Creating admin_actions table...");
  await sql`
    CREATE TABLE IF NOT EXISTS admin_actions (
      id SERIAL PRIMARY KEY,
      admin_google_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_user_id INTEGER,
      changes JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  console.log("Setting admin role for ADMIN_EMAILS...");
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  for (const email of adminEmails) {
    const result = await sql`UPDATE users SET role = 'admin' WHERE email = ${email} RETURNING id, email`;
    if (result.length > 0) {
      console.log(`  ✓ ${email} → admin (id: ${result[0].id})`);
    } else {
      console.log(`  - ${email} not found in users table (will be set on next sign-in)`);
    }
  }

  console.log("\nMigration complete!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
