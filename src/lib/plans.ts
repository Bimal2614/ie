/**
 * What each plan buys.
 *
 * ONE TABLE, READ EVERYWHERE. The pricing page, the gates on every submit, and
 * the upgrade prompts all read this file, so a tier cannot say one thing to a
 * visitor and enforce another on a candidate. `users.plan` stores only the name
 * of the tier — everything it entitles is here, which is why re-pricing or
 * moving a feature between tiers needs no migration.
 *
 * Deliberately free of imports and of `server-only`: client components render
 * the limits ("12 of 50 left this month"), so this has to be safe on both
 * sides. Nothing here reads the database or trusts a caller — the gates in
 * src/lib/security/plan-guard.ts are what enforce it, server-side.
 */

export const PLAN_KEYS = ["free", "pro", "premium"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

/** The four IELTS skills, named as `user_responses.section` names them. */
export type SectionKey = "listening" | "reading" | "writing" | "speaking";

export type Entitlements = {
  /** Display name, as the pricing page and upgrade prompts say it. */
  label: string;
  /** What ONE payment costs, in minor units (cents). 0 for free. */
  priceCents: number;
  /**
   * How long that one payment buys, in months.
   *
   * THE BILLING TERM, NOT AN ALLOWANCE. The monthly quotas below still reset on
   * the calendar month inside it — a quarterly plan does not hand over three
   * months of questions on day one. `subscriptions.current_period_end` is
   * computed from this, so a tier sold by the quarter grants a quarter; the
   * flat "one month from the start" this replaces is precisely how a 3-month
   * sale ends up with a 1-month window.
   *
   * 0 for free, which is the absence of a subscription rather than a term.
   */
  billingMonths: number;
  /**
   * Practice answers a candidate may record per calendar month.
   * `null` = unlimited. Counted in ANSWERS (one row per gap), because that is
   * the unit a candidate experiences as "a question".
   */
  monthlyPracticeAnswers: number | null;
  /**
   * Which skills may be practised at all.
   *
   * Free is Reading and Listening: those are keyed and graded locally, so they
   * cost nothing to serve. Writing and Speaking are the AI-scored ones, and
   * handing them out unscored would be worse than withholding them — the
   * candidate writes a full essay and gets back a blank band.
   */
  practiceSections: readonly SectionKey[];
  /** AI band scoring for Writing and Speaking (the expensive part). */
  aiScoring: boolean;
  /** Full mock sittings that may be STARTED per calendar month. 0 = none. */
  monthlyMockSittings: number | null;
  /** Jumps the scoring queue. See src/lib/scoring/concurrency.ts. */
  priorityScoring: boolean;
  /** Band-prediction reports and the personalised weekly study plan. */
  advancedReports: boolean;
};

export const PLANS: Record<PlanKey, Entitlements> = {
  free: {
    label: "Free",
    priceCents: 0,
    billingMonths: 0,
    monthlyPracticeAnswers: 50,
    practiceSections: ["reading", "listening"],
    aiScoring: false,
    monthlyMockSittings: 0,
    priorityScoring: false,
    advancedReports: false,
  },
  pro: {
    label: "Pro",
    priceCents: 1500,
    // Pro is HIDDEN, not retired — see OFFERED_PLANS below, and the card it
    // still needs on the pricing page. One month is the term it has always been
    // sold on, so accounts already holding it keep the window they bought;
    // change this only if it goes back on sale with a different term.
    billingMonths: 1,
    monthlyPracticeAnswers: null,
    practiceSections: ["reading", "listening", "writing", "speaking"],
    aiScoring: true,
    monthlyMockSittings: null,
    priorityScoring: false,
    advancedReports: false,
  },
  premium: {
    label: "Premium",
    priceCents: 3500,
    billingMonths: 3,
    monthlyPracticeAnswers: null,
    practiceSections: ["reading", "listening", "writing", "speaking"],
    aiScoring: true,
    monthlyMockSittings: null,
    priorityScoring: true,
    advancedReports: true,
  },
};

/* ------------------------------------------------------------------ *
 * Where a plan stops
 *
 * The SHAPE of a refusal lives here rather than beside the gates that produce
 * it, because both sides of the wire need it: the server builds one, and the
 * browser renders it. src/lib/security/plan-guard.ts is `server-only`, so a
 * client component importing the type from there would pull a server module
 * into the bundle and fail the build.
 * ------------------------------------------------------------------ */

export type PlanBlockCode =
  /** The skill isn't on this plan at all (Writing/Speaking on free). */
  | "section_locked"
  /** The monthly allowance is spent. */
  | "quota_exhausted"
  /** The feature needs a higher tier (mocks, AI scoring, reports). */
  | "upgrade_required";

export type PlanBlock = {
  blocked: true;
  code: PlanBlockCode;
  /** Safe to render as-is. Says what happened and what lifts it. */
  message: string;
  /** The cheapest plan that would allow this. */
  requiredPlan: PlanKey;
  /** Where the upgrade prompt should send them. */
  upgradeHref: string;
  /** Present on `quota_exhausted`, so the UI can show "50 / 50". */
  used?: number;
  limit?: number;
  /** ISO date the allowance resets, for the same reason. */
  resetsAt?: string;
};

/** Narrows an action's return value: `if (isPlanBlock(res)) …`. */
export function isPlanBlock(value: unknown): value is PlanBlock {
  return typeof value === "object" && value !== null && (value as PlanBlock).blocked === true;
}

/* ------------------------------------------------------------------ *
 * What is actually on sale
 * ------------------------------------------------------------------ */

/**
 * The paid tiers a candidate can be put on today, cheapest first.
 *
 * ONLY PREMIUM IS SOLD. Pro stays defined in `PLANS` above rather than being
 * deleted: `users.plan` is a database enum and a subscription that was granted
 * on Pro must still resolve to the entitlements it was sold with, or an old row
 * would silently read as `free`. What this list controls is the FUTURE — the
 * tiers the pricing page offers, the tiers an admin can grant, and the tier
 * every "upgrade to X" prompt names. Selling Pro again is adding it back here,
 * not editing the gates.
 */
export const OFFERED_PLANS = ["premium"] as const satisfies readonly Exclude<PlanKey, "free">[];

export type OfferedPlan = (typeof OFFERED_PLANS)[number];

/** The tier a purchase or a manual grant lands on when none is named. */
export const DEFAULT_OFFERED_PLAN: OfferedPlan = OFFERED_PLANS[0];

export function isOfferedPlan(value: unknown): value is OfferedPlan {
  return (OFFERED_PLANS as readonly string[]).includes(String(value));
}

/** Ranking, for "is this at least Pro?" questions and for upgrade/downgrade logs. */
const RANK: Record<PlanKey, number> = { free: 0, pro: 1, premium: 2 };

export function planRank(plan: PlanKey): number {
  return RANK[plan];
}

/** True when `plan` includes everything `required` does. */
export function planAtLeast(plan: PlanKey, required: PlanKey): boolean {
  return RANK[plan] >= RANK[required];
}

export function entitlements(plan: PlanKey): Entitlements {
  return PLANS[plan];
}

/** Narrow an unvalidated string (a DB read from before an enum change, a param). */
export function toPlanKey(value: unknown): PlanKey {
  return (PLAN_KEYS as readonly string[]).includes(String(value)) ? (value as PlanKey) : "free";
}

/**
 * The tier an account is ACTUALLY on right now.
 *
 * A stored tier and an expiry that has passed is a lapsed subscription: the
 * cron sweep normally writes the account back to `free`, but between the moment
 * a period ends and the sweep's next run, the column still says "pro". Every
 * read goes through here so that gap grants nothing — the sweep tidies the
 * database, it is not what enforces the boundary.
 */
export function effectivePlan(
  plan: PlanKey,
  expiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): PlanKey {
  if (plan === "free") return "free";
  if (!expiresAt) return plan; // no expiry = does not lapse (lifetime / manual grant)
  const ends = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(ends.getTime())) return "free"; // unparseable: fail closed
  return ends.getTime() > now.getTime() ? plan : "free";
}

/**
 * The cheapest plan that grants `feature`, for "upgrade to X" prompts.
 *
 * Searches what is ON SALE, not every tier that exists. Ranking Pro first here
 * would send a candidate who wants AI scoring to a plan with nothing to click.
 */
export function cheapestPlanWith(feature: (e: Entitlements) => boolean): PlanKey {
  const onSale: readonly PlanKey[] = ["free", ...OFFERED_PLANS];
  return onSale.find((k) => feature(PLANS[k])) ?? DEFAULT_OFFERED_PLAN;
}

/**
 * First instant of the current billing month, UTC.
 *
 * Monthly allowances reset on the CALENDAR month rather than on a rolling
 * 30 days: "50 a month" is what the pricing page promises, and a rolling window
 * would trickle single answers back mid-month instead of resetting cleanly. UTC
 * so the reset does not depend on the server's timezone.
 */
export function monthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * The denominator in "$35 / 3 months" — what one payment buys, in words.
 *
 * Here and not in the page's copy, because it is a term of sale rather than
 * marketing: the card, the payment dialog and the admin grant screen all say it
 * about the same purchase, and the one that drifts is the one that becomes a
 * false promise. Free has no term, and reads "forever".
 */
export function billingPeriodLabel(plan: PlanKey): string {
  const months = PLANS[plan].billingMonths;
  if (months <= 0) return "forever";
  return months === 1 ? "month" : `${months} months`;
}

/** "$15" / "$0" — the pricing page's format, from the one stored number. */
export function formatPrice(cents: number, currency = "USD"): string {
  const amount = cents / 100;
  const s = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return currency === "USD" ? `$${s}` : `${s} ${currency}`;
}
