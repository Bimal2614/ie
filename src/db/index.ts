import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Single pooled postgres-js client, cached on globalThis so Next.js HMR in dev
 * doesn't open a new pool on every reload (which exhausts connections).
 *
 * postgres-js parameterizes every query via tagged templates, which is our
 * first line of defense against SQL injection.
 */
const globalForDb = globalThis as unknown as {
  __ieltsSql?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__ieltsSql ??
  postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    ssl: env.DATABASE_SSL === "true" ? "require" : undefined,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.__ieltsSql = client;
}

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
