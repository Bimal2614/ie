import { sql } from "drizzle-orm";
import { db } from "@/db";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * Atomic, DB-backed fixed-window rate limiter.
 *
 * A single SQL upsert both increments the counter and resets the window when
 * it has expired — so it is race-safe across concurrent requests and across
 * multiple server instances (unlike an in-memory map). Returns whether the
 * caller is within `max` hits per `windowSec`.
 *
 * Example keys: `login:ip:203.0.113.7`, `login:email:user@example.com`.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const rows = (await db.execute(sql`
    INSERT INTO rate_limits (key, count, window_start, expires_at)
    VALUES (${key}, 1, now(), now() + make_interval(secs => ${windowSec}::int))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.expires_at < now() THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.expires_at < now() THEN now()
        ELSE rate_limits.window_start
      END,
      expires_at = CASE
        WHEN rate_limits.expires_at < now() THEN now() + make_interval(secs => ${windowSec}::int)
        ELSE rate_limits.expires_at
      END
    RETURNING count, expires_at
  `)) as unknown as Array<{ count: number; expires_at: string | Date }>;

  const row = rows[0];
  const count = Number(row.count);
  const expiresAt = new Date(row.expires_at);
  const retryAfterSec = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    retryAfterSec: count > max ? retryAfterSec : 0,
  };
}

/** Best-effort: clear a limiter key (e.g. after a successful login). */
export async function clearRateLimit(key: string): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE key = ${key}`);
}
