/**
 * Seed script — creates a first admin account so you can log in immediately.
 * Run with: npm run db:seed   (after the DB is migrated)
 *
 * Uses its own postgres client (not src/db/index.ts) so it doesn't pull in the
 * Next.js path aliases when executed via tsx.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { users } from "./schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (check .env.local)");

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql, { schema, casing: "snake_case" });

  const email = "admin@ielts.local";
  const emailNormalized = email.toLowerCase();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);

  if (existing.length) {
    console.log(`✓ Seed user already exists: ${email}`);
  } else {
    const passwordHash = await bcrypt.hash("Admin@12345", 12);
    await db.insert(users).values({
      name: "Admin",
      email,
      emailNormalized,
      passwordHash,
      role: "admin",
      emailVerified: true,
      targetModule: "academic",
      targetBand: "8.0",
    });
    console.log(`✓ Seeded admin user → ${email} / Admin@12345`);
  }

  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
