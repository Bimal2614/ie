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

/**
 * Is this a hosted Postgres reached through its CONNECTION POOLER?
 *
 * On a serverless platform there is no single long-lived server: every route is
 * its own function, each running instance holds its own pool, and the platform
 * scales instances with traffic. Multiply that out against a small managed
 * compute — Neon's entry sizes allow on the order of a hundred backends — and a
 * busy evening exhausts the database's connection slots while the app is barely
 * working. Requests then fail with "too many connections", which looks nothing
 * like the capacity problem it is.
 *
 * The pooler exists exactly for this shape: it accepts thousands of client
 * connections and multiplexes them onto a small number of real backends. On Neon
 * it is the same host with `-pooler` in it; other providers use a separate port.
 * Nothing about the app changes — this only checks that the URL points at it, so
 * the mistake is caught at boot instead of at peak.
 */
function isPooledUrl(url: string): boolean {
  try {
    const { hostname, port } = new URL(url);
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
    // Neon: ep-xxx-pooler.region.aws.neon.tech. Supabase/PgBouncer: port 6543.
    return hostname.includes("-pooler") || hostname.includes("pgbouncer") || port === "6543";
  } catch {
    return true; // Not our business to fail on a URL the driver will reject anyway.
  }
}

if (env.NODE_ENV === "production" && !isPooledUrl(env.DATABASE_URL)) {
  console.warn(
    "[db] DATABASE_URL does not look like a pooled endpoint. On serverless this " +
      "runs out of database connections under load — use the pooled host " +
      "(Neon: add `-pooler` to the endpoint id) for the app, and keep the direct " +
      "URL for migrations only.",
  );
}

const client =
  globalForDb.__ieltsSql ??
  postgres(env.DATABASE_URL, {
    /**
     * Per running instance, not per app. Behind a pooler this is a ceiling on
     * how much ONE instance can ask for at once, so it wants to be small: ten
     * concurrent queries is already more than a page render needs, and a lower
     * number means a burst queues in the app (fast, local, fair) instead of
     * racing every other instance for backends.
     */
    max: 8,
    /**
     * Serverless instances are frozen between requests and eventually discarded.
     * Handing a connection back quickly keeps an idle instance from sitting on
     * pooler slots that a busy one needs.
     */
    idle_timeout: 20,
    /**
     * Fail fast instead of hanging. Without this a connect attempt to a database
     * that is unreachable (or a compute still waking) can hold the request for
     * the function's whole duration, turning a 2-second blip into a timeout.
     */
    connect_timeout: 10,
    /**
     * Recycle connections every half hour. A managed compute can be moved,
     * resized or restarted underneath a long-lived socket; a bounded lifetime
     * means the pool renews itself rather than holding a connection to somewhere
     * that has gone.
     */
    max_lifetime: 60 * 30,
    ssl: needsSsl(env.DATABASE_URL) ? "require" : undefined,
  });

// Cached in EVERY environment, not just dev. The dev reason was HMR; the
// production reason is that a process can end up with more than one instance of
// this module (separate server chunks importing it), and each one would open its
// own pool against the same `max`.
globalForDb.__ieltsSql = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
