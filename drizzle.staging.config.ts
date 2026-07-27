import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

/**
 * Staging migrations config. Same schema + SAME migration history (out dir) as
 * local, but targeting STAGING_DATABASE_URL over SSL.
 *
 *   1st time:  npm run db:generate  (writes the migration files — env-agnostic)
 *              npm run db:migrate:staging   (creates the tables on staging)
 *   after any schema change: db:generate → db:migrate:staging
 */
config({ path: ".env.local" });

const raw = process.env.STAGING_DATABASE_URL;
if (!raw) {
  throw new Error("STAGING_DATABASE_URL is not set — add it to .env.local before running staging migrations.");
}

// DDL migrations must run on Neon's DIRECT endpoint, not the pooled one:
// the pooler (pgbouncer, transaction mode) breaks Drizzle's migration
// transaction/advisory lock, so `migrate` silently applies nothing. Strip the
// `-pooler` suffix from the host for migrations only; the app/seed keep the
// pooled URL. (No-op for non-Neon URLs that don't contain `-pooler`.)
const url = raw.replace("-pooler", "");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  // Match the runtime client so DDL uses snake_case columns.
  casing: "snake_case",
  dbCredentials: { url, ssl: "require" },
  strict: true,
  verbose: true,
});
