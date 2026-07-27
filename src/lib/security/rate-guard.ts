import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions, auditLog } from "@/db/schema";
import { env } from "@/lib/env";
import { getRequestContext } from "@/lib/session";
import { rateLimit } from "./rate-limit";

/**
 * Per-account rate limiting on top of the DB limiter.
 *
 *  - General actions: RATE_LIMIT_GENERAL_PER_MINUTE + _PER_DAY.
 *  - AI (Writing/Speaking scoring): RATE_LIMIT_AI_PER_DAY + a per-account cap
 *    (RATE_LIMIT_AI_PER_ACCOUNT over RATE_LIMIT_AI_ACCOUNT_WINDOW_DAYS).
 *
 * Every time a user is throttled it is logged to the audit log; once the
 * violations reach RATE_LIMIT_VIOLATIONS_BEFORE_DEACTIVATE within the violation
 * window, the account is automatically deactivated (all sessions revoked). All
 * thresholds are read from the environment, so they are fully configurable.
 */

export const SLOW_DOWN = "You're going too fast — please slow down and try again shortly.";

export class RateLimitError extends Error {
  readonly retryAfterSec: number;
  constructor(retryAfterSec = 60, message = SLOW_DOWN) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

const DAY = 86_400;
/** Large ceiling so the limiter never blocks — we only read back the count. */
const COUNTER_MAX = 1_000_000;

async function audit(userId: string, event: string, metadata: Record<string, unknown>) {
  try {
    const { ip, userAgent } = await getRequestContext();
    await db.insert(auditLog).values({ userId, event, ipAddress: ip, userAgent, metadata });
  } catch {
    // Auditing must never break the request path.
  }
}

/** Record a throttling event; deactivate the account once the limit is reached. */
async function registerViolation(userId: string, scope: string): Promise<void> {
  await audit(userId, "rate_limit.exceeded", { scope });

  const windowSec = env.RATE_LIMIT_VIOLATION_WINDOW_DAYS * DAY;
  const r = await rateLimit(`rl-violation:${userId}`, COUNTER_MAX, windowSec);
  const violations = COUNTER_MAX - r.remaining; // actual count in the window

  if (violations >= env.RATE_LIMIT_VIOLATIONS_BEFORE_DEACTIVATE) {
    const reason = `Automatic: ${violations} rate-limit violations within ${env.RATE_LIMIT_VIOLATION_WINDOW_DAYS} days`;
    await db
      .update(users)
      .set({ deactivatedAt: new Date(), deactivationReason: reason, updatedAt: new Date() })
      .where(eq(users.id, userId));
    // Revoke every session so the account is locked out immediately.
    await db.delete(sessions).where(eq(sessions.userId, userId));
    await audit(userId, "account.deactivated", { reason, violations });
  }
}

/** Throttle general per-user actions (60/min + 6000/day by default). */
export async function guardGeneral(userId: string): Promise<void> {
  const [perMin, perDay] = await Promise.all([
    rateLimit(`gen:min:${userId}`, env.RATE_LIMIT_GENERAL_PER_MINUTE, 60),
    rateLimit(`gen:day:${userId}`, env.RATE_LIMIT_GENERAL_PER_DAY, DAY),
  ]);
  if (!perMin.allowed || !perDay.allowed) {
    await registerViolation(userId, "general");
    throw new RateLimitError(Math.max(perMin.retryAfterSec, perDay.retryAfterSec));
  }
}

/** Throttle expensive AI scoring (100/day + a per-account cap by default). */
export async function guardAi(userId: string): Promise<void> {
  const [perDay, perAccount] = await Promise.all([
    rateLimit(`ai:day:${userId}`, env.RATE_LIMIT_AI_PER_DAY, DAY),
    rateLimit(`ai:acct:${userId}`, env.RATE_LIMIT_AI_PER_ACCOUNT, env.RATE_LIMIT_AI_ACCOUNT_WINDOW_DAYS * DAY),
  ]);
  if (!perDay.allowed || !perAccount.allowed) {
    await registerViolation(userId, "ai");
    throw new RateLimitError(Math.max(perDay.retryAfterSec, perAccount.retryAfterSec));
  }
}
