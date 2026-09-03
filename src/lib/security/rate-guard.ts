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
 * THE TWO DIFFER IN WHAT A REFUSAL MEANS, and that is the whole design. A
 * general refusal is a flood: it is logged as a violation, and
 * RATE_LIMIT_VIOLATIONS_BEFORE_DEACTIVATE of those inside the violation window
 * deactivate the account and revoke its sessions. An AI refusal is an empty
 * allowance: it is audited and returned to the caller, and escalates to nothing.
 * Only a rate a user can actually choose may cost them their account — see
 * `tryConsumeAi`. All thresholds are read from the environment.
 */

export const SLOW_DOWN = "You're going too fast: please slow down and try again shortly.";

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

/**
 * Ceiling for proxied media reads, per user per minute.
 *
 * Generous on purpose. One recording is fetched as many byte ranges, not one
 * request — every seek, every resume, every duration probe is another — so this
 * is a flood stop, not a budget.
 */
const MEDIA_READS_PER_MINUTE = 600;

/**
 * Throttle media byte-range reads.
 *
 * DELIBERATELY NOT guardGeneral. Listening audio is streamed through us rather
 * than redirected (see src/lib/protected-media.ts), so a single part can spend
 * dozens of requests from the general 60/minute allowance — which would throttle
 * a candidate in the middle of a timed module and, three throttles later,
 * deactivate their account for it. This one 429s and registers no violation:
 * playing the exam you are sitting is not abuse.
 */
export async function guardMedia(userId: string): Promise<void> {
  const r = await rateLimit(`media:min:${userId}`, MEDIA_READS_PER_MINUTE, 60);
  if (!r.allowed) throw new RateLimitError(r.retryAfterSec);
}

/** What the caller is told when there is no AI budget left. */
export const AI_BUDGET_SPENT =
  "You've used your AI marking allowance for now. Your answers are saved — please try again later.";

export type AiBudget = {
  allowed: boolean;
  retryAfterSec: number;
  /** Ready to show a candidate. Empty when allowed. */
  message: string;
};

/**
 * Take an AI scoring token if the account has one (100/day + a per-account cap
 * by default).
 *
 * IT RETURNS A REFUSAL; IT DOES NOT REGISTER A VIOLATION, AND IT NEVER THROWS.
 * This is deliberate, and it replaced a `guardAi` that did both.
 *
 * Running out of AI budget is not abuse. It is a quota — a property of the plan
 * and the day, reached by using the product as designed. Treating it as a
 * violation put it on the same counter that DEACTIVATES AN ACCOUNT after three
 * strikes and deletes every one of its sessions.
 *
 * That was not theoretical. Scoring is retried by machinery the candidate cannot
 * see: `after()` at submit, and a sweeper cron every five minutes. One account
 * that spent its allowance would be asked for a token it did not have on every
 * sweep, and three sweeps — fifteen minutes — would lock the person out of a
 * product they had paid for, for something they did not do. Escalation must not
 * be reachable from OUR retry loop.
 *
 * Flood detection lives where it belongs: `guardGeneral`, which counts actions a
 * user actually drives, at 60 a minute. That is what a violation should mean.
 */
export async function tryConsumeAi(userId: string): Promise<AiBudget> {
  const [perDay, perAccount] = await Promise.all([
    rateLimit(`ai:day:${userId}`, env.RATE_LIMIT_AI_PER_DAY, DAY),
    rateLimit(`ai:acct:${userId}`, env.RATE_LIMIT_AI_PER_ACCOUNT, env.RATE_LIMIT_AI_ACCOUNT_WINDOW_DAYS * DAY),
  ]);
  if (perDay.allowed && perAccount.allowed) {
    return { allowed: true, retryAfterSec: 0, message: "" };
  }
  // Audited, so an exhausted allowance is still visible to support — just not
  // punished.
  await audit(userId, "rate_limit.ai_exhausted", { scope: "ai" });
  return {
    allowed: false,
    retryAfterSec: Math.max(perDay.retryAfterSec, perAccount.retryAfterSec),
    message: AI_BUDGET_SPENT,
  };
}
