import "server-only";

import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { mockTestSessions, userResponses, users } from "@/db/schema";
import {
  effectivePlan,
  entitlements,
  monthStart,
  PLANS,
  OFFERED_PLANS,
  DEFAULT_OFFERED_PLAN,
  toPlanKey,
  type PlanBlock,
  type PlanBlockCode,
  type PlanKey,
  type SectionKey,
} from "@/lib/plans";
import type { AuthenticatedUser } from "@/lib/session";

/**
 * Where a plan stops.
 *
 * WHY THESE RETURN A VALUE INSTEAD OF THROWING. Next redacts a thrown server
 * error in production — the client gets "an error occurred", which is exactly
 * the wrong thing to show someone who has hit a limit and needs to know what to
 * do about it. Every check here hands back a `PlanBlock` the caller can return
 * to the browser verbatim: a code to branch on, a sentence to display, and the
 * plan that would lift it.
 *
 * WHAT IS AND IS NOT ENFORCED HERE. This module is the server's answer, taken
 * from `AuthenticatedUser.plan`, which is read from the session's own row and
 * already resolved against the expiry. Nothing on the page is trusted: hiding a
 * button is a courtesy to the candidate, and these functions are the boundary.
 *
 * See src/lib/plans.ts for the entitlements themselves.
 */

// The shape itself lives in @/lib/plans, which is safe on both sides of the
// wire; a client component must import it from there, never from this module.
export type { PlanBlock, PlanBlockCode } from "@/lib/plans";

const UPGRADE_HREF = "/pricing";

function block(
  code: PlanBlockCode,
  message: string,
  requiredPlan: PlanKey,
  extra: Partial<PlanBlock> = {},
): PlanBlock {
  return { blocked: true, code, message, requiredPlan, upgradeHref: UPGRADE_HREF, ...extra };
}

/** First instant of NEXT month — when a monthly allowance comes back. */
function nextMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/* ------------------------------------------------------------------ *
 * Usage counters
 * ------------------------------------------------------------------ */

/**
 * Practice answers recorded this calendar month.
 *
 * Counts ROWS in `user_responses`, which is one per answered gap — the same
 * unit the pricing page means by "50 practice questions / month", and the same
 * unit a candidate sees on their answer sheet. Skipped gaps write no row, so an
 * abandoned paper costs nothing.
 *
 * Mock sittings are NOT counted here: their answers live in `mock_test_answers`,
 * and a mock is gated as a whole by `checkMockAccess` instead.
 */
export async function practiceAnswersThisMonth(userId: string, now = new Date()): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(userResponses)
    .where(and(eq(userResponses.userId, userId), gte(userResponses.createdAt, monthStart(now))));
  return Number(row?.n ?? 0);
}

/** Mock sittings STARTED this calendar month, finished or not. */
export async function mockSittingsThisMonth(userId: string, now = new Date()): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(mockTestSessions)
    .where(
      and(eq(mockTestSessions.userId, userId), gte(mockTestSessions.startedAt, monthStart(now))),
    );
  return Number(row?.n ?? 0);
}

/**
 * What a candidate has left this month — for the dashboard and the practice
 * header, so the ceiling is visible before it is hit rather than at submit.
 */
export async function planUsage(user: AuthenticatedUser) {
  const e = entitlements(user.plan);
  const used = e.monthlyPracticeAnswers === null ? 0 : await practiceAnswersThisMonth(user.id);
  return {
    plan: user.plan,
    planLabel: e.label,
    practiceUsed: used,
    practiceLimit: e.monthlyPracticeAnswers,
    practiceRemaining:
      e.monthlyPracticeAnswers === null ? null : Math.max(0, e.monthlyPracticeAnswers - used),
    resetsAt: nextMonthStart().toISOString(),
    sections: e.practiceSections,
    aiScoring: e.aiScoring,
    mocks: e.monthlyMockSittings,
  };
}

/* ------------------------------------------------------------------ *
 * The gates
 * ------------------------------------------------------------------ */

/**
 * The cheapest plan whose entitlements satisfy `want`.
 *
 * Searches only what is on sale. Pro entitles most of what these gates ask
 * about, so a hard-coded ["free", "pro", "premium"] would put "upgrade to Pro"
 * in the refusal message of a candidate who has no way to buy Pro.
 */
function cheapestWith(want: (e: (typeof PLANS)[PlanKey]) => boolean): PlanKey {
  const onSale: readonly PlanKey[] = ["free", ...OFFERED_PLANS];
  return onSale.find((k) => want(PLANS[k])) ?? DEFAULT_OFFERED_PLAN;
}

/**
 * May this candidate practise these skills, and have they any allowance left?
 *
 * `sections` is what the submitted work actually contains, read server-side
 * from the set — never from a parameter the client chose.
 */
export async function checkPracticeAccess(
  user: AuthenticatedUser,
  sections: readonly SectionKey[],
  now = new Date(),
): Promise<PlanBlock | null> {
  const e = entitlements(user.plan);

  const locked = [...new Set(sections)].filter((s) => !e.practiceSections.includes(s));
  if (locked.length > 0) {
    const names = locked.map((s) => s[0].toUpperCase() + s.slice(1));
    const required = cheapestWith((p) => locked.every((s) => p.practiceSections.includes(s)));
    // Said from the candidate's side: they have written the answer, and what
    // they cannot have is the marking. Naming the skill matters — "your plan"
    // alone leaves them guessing which half of the paper is affected.
    return block(
      "section_locked",
      `You're on the ${e.label} plan. ${names.join(" and ")} answers are marked by our AI ` +
        `examiner, which needs a purchased plan — ${PLANS[required].label} or above.`,
      required,
    );
  }

  if (e.monthlyPracticeAnswers === null) return null;

  const used = await practiceAnswersThisMonth(user.id, now);
  if (used < e.monthlyPracticeAnswers) return null;

  // Checked BEFORE the work is graded, and only when the allowance is already
  // spent. A set is an indivisible piece of work — refusing it halfway through
  // because the 50th answer fell inside it would throw away answers the
  // candidate has already written, so a submit that starts under the limit is
  // allowed to finish over it.
  const resetsAt = nextMonthStart(now);
  return block(
    "quota_exhausted",
    `You're on the ${e.label} plan and have used all ${e.monthlyPracticeAnswers} practice questions this month. ` +
      `Your allowance resets on ${resetsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}.`,
    "pro",
    { used, limit: e.monthlyPracticeAnswers, resetsAt: resetsAt.toISOString() },
  );
}

/** May this candidate have Writing/Speaking answers band-scored by the AI? */
export function checkAiScoring(user: AuthenticatedUser): PlanBlock | null {
  const e = entitlements(user.plan);
  if (e.aiScoring) return null;

  const required = cheapestWith((p) => p.aiScoring);
  return block(
    "upgrade_required",
    `AI band scoring for Writing and Speaking is part of ${PLANS[required].label}. ` +
      `The ${e.label} plan covers Reading and Listening, which are marked instantly.`,
    required,
  );
}

/** May this candidate start a full mock sitting? */
export async function checkMockAccess(
  user: AuthenticatedUser,
  now = new Date(),
): Promise<PlanBlock | null> {
  const e = entitlements(user.plan);
  const required = cheapestWith((p) => p.monthlyMockSittings === null || p.monthlyMockSittings > 0);

  // No query when the plan has no mocks at all — the commonest case by far.
  if (e.monthlyMockSittings === 0) {
    return block(
      "upgrade_required",
      `Full mock tests are part of ${PLANS[required].label}. The ${e.label} plan covers ` +
        `Reading and Listening practice.`,
      required,
    );
  }
  if (e.monthlyMockSittings === null) return null;

  const used = await mockSittingsThisMonth(user.id, now);
  if (used < e.monthlyMockSittings) return null;

  const resetsAt = nextMonthStart(now);
  return block(
    "quota_exhausted",
    `You've started all ${e.monthlyMockSittings} mock tests included this month on ${e.label}. ` +
      `Your allowance resets on ${resetsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}.`,
    required,
    { used, limit: e.monthlyMockSittings, resetsAt: resetsAt.toISOString() },
  );
}

/** May this candidate see band-prediction reports and the study plan? */
export function checkAdvancedReports(user: AuthenticatedUser): PlanBlock | null {
  const e = entitlements(user.plan);
  if (e.advancedReports) return null;

  const required = cheapestWith((p) => p.advancedReports);
  return block(
    "upgrade_required",
    `Band-prediction reports and the weekly study plan are part of ${PLANS[required].label}.`,
    required,
  );
}

/* ------------------------------------------------------------------ *
 * Background use
 * ------------------------------------------------------------------ */

/**
 * The AI-scoring check for code with no session in hand.
 *
 * `after()` callbacks and the mock scorers run past the request that authorised
 * them, and re-reading the cookie there is not possible. They pass a user id and
 * this reads the tier straight from the row — the same answer the session would
 * have given, including the expiry check, because a subscription can lapse
 * between a submit and the scoring it scheduled.
 */
export async function userMayUseAiScoring(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return false;

  return entitlements(effectivePlan(toPlanKey(row.plan), row.planExpiresAt)).aiScoring;
}

/**
 * Sections present in a set of practice rows, for the gate above.
 * Exported so an action can ask the same question the guard does.
 */
export async function sectionsOfAttempt(attemptId: string): Promise<SectionKey[]> {
  const rows = await db
    .selectDistinct({ section: userResponses.section })
    .from(userResponses)
    .where(eq(userResponses.attemptId, attemptId));
  return rows.map((r) => r.section as SectionKey);
}
