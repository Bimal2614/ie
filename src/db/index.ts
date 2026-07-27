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

/**
 * Managed Postgres (Neon, Supabase, RDS, …) requires TLS. Force SSL whenever
 * DATABASE_SSL=true, the URL asks for it, OR the host is remote — only genuine
 * localhost connections default to plaintext. This prevents "connection is
 * insecure" failures when pointing a build at a hosted DB.
 */
function needsSsl(url: string): boolean {
  if (env.DATABASE_SSL === "true") return true;
  if (/sslmode=require/i.test(url)) return true;
  try {
    const host = new URL(url).hostname;
    return !(host === "localhost" || host === "127.0.0.1" || host === "::1");
  } catch {
    return false;
  }
}

const client =
  globalForDb.__ieltsSql ??
  postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    ssl: needsSsl(env.DATABASE_URL) ? "require" : undefined,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.__ieltsSql = client;
}

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
