import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so load env explicitly.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  // Must match the runtime client (src/db/index.ts) so generated DDL uses
  // snake_case column names instead of the camelCase JS property names.
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://ielts:ielts@localhost:5432/ielts",
  },
  strict: true,
  verbose: true,
});
