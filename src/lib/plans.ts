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

/**
 * The currencies a plan can be SOLD in.
 *
 * TWO, BECAUSE THE CARD IS CHARGED IN ONE OF THEM. Razorpay settles a
 * subscription in whatever currency the plan behind it was created with, and a
 * plan is immutable — so "the same tier, priced for a candidate outside India"
 * is a second Razorpay plan, with its own `plan_…`, its own amount, and its own
 * entry in the table below. Everything downstream (the pricing card, the
 * Checkout modal, `subscriptions.currency`, the ledger) reads the currency from
 * one place so a figure is never a bare number whose unit has to be guessed.
 *
 * INR IS THE BASE. Every Razorpay account can charge it, so it is what a
 * request whose country cannot be determined falls back to — see
 * src/lib/payments/region.ts. USD is the international price and needs
 * international payments enabled on the Razorpay account.
 */
export const BILLING_CURRENCIES = ["INR", "USD"] as const;
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];

/**
 * What a price means when nobody has said otherwise.
 *
 * An admin grant, a reconciled bank transfer and a figure on an internal screen
 * are all rupees, and a lookup that cannot resolve a country resolves to this.
 */
export const DEFAULT_CURRENCY: BillingCurrency = "INR";

export function isBillingCurrency(value: unknown): value is BillingCurrency {
  return (BILLING_CURRENCIES as readonly string[]).includes(String(value));
}

/** Narrow anything a browser, a header or an old row hands us. Never throws. */
export function toBillingCurrency(value: unknown): BillingCurrency {
  return isBillingCurrency(value) ? value : DEFAULT_CURRENCY;
}

export const PLAN_KEYS = ["free", "pro", "premium"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

/** The four IELTS skills, named as `user_responses.section` names them. */
export type SectionKey = "listening" | "reading" | "writing" | "speaking";

/**
 * One tier's figures in ONE currency.
 *
 * `listPriceCents` is SHOWN STRUCK THROUGH, NEVER CHARGED — `priceCents` stays
 * the single number a payment, a subscription row and every gate read, and this
 * one is copy. It lives here rather than in the pricing page's markup for the
 * same reason the real price does: a "was ₹4,000" typed into a card is a claim
 * about a purchase, and the hand-written one is what drifts. Ending the
 * promotion is setting this back to `null`, not editing figures in a page.
 * `null` on a tier that is not discounted, and on free, which has no price to
 * cut.
 */
export type Price = {
  /** In minor units of the currency it is keyed under. 0 for free. */
  priceCents: number;
  listPriceCents: number | null;
};

export type Entitlements = {
  /** Display name, as the pricing page and upgrade prompts say it. */
  label: string;
  /**
   * What ONE payment costs, PER CURRENCY, in minor units (paise, or cents).
   *
   * EVERY CURRENCY HERE NEEDS ITS OWN RAZORPAY PLAN, and the amounts must match
   * that plan exactly — `resolvePlanTerms` in src/lib/payments/billing.ts reads
   * the plan back before every checkout and REFUSES THE SALE when the two
   * disagree, rather than charging a figure the candidate was never shown. So
   * editing a number here without editing the Razorpay plan does not
   * mis-charge anyone; it takes the tier off sale in that currency until they
   * agree again.
   *
   * The USD figures are the international price, not a converted one: they are
   * round numbers a card statement reads cleanly, and they do not move with the
   * exchange rate. Free is 0 in both, which is the absence of a price.
   */
  prices: Record<BillingCurrency, Price>;
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
    prices: {
      INR: { priceCents: 0, listPriceCents: null },
      USD: { priceCents: 0, listPriceCents: null },
    },
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
    prices: {
      // ₹1,299 a month, down from ₹1,999.
      INR: { priceCents: 129900, listPriceCents: 199900 },
      // $15 a month, down from $23 — the same discount, in round dollars.
      USD: { priceCents: 1500, listPriceCents: 2300 },
    },
    // One month is the term Pro has always been sold on, so accounts already
    // holding it keep the window they bought.
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
    prices: {
      // ₹2,499 now, down from ₹4,000.
      INR: { priceCents: 249900, listPriceCents: 400000 },
      // $30 for the quarter, down from $46.
      USD: { priceCents: 3000, listPriceCents: 4600 },
    },
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
 * The paid tiers a candidate can be put on today, CHEAPEST FIRST.
 *
 * This list controls the tiers the pricing page offers, the tiers an admin can
 * grant, and the tier every "upgrade to X" prompt names — it is not what the
 * gates read. Pro was hidden here for a while and stayed defined in `PLANS`
 * throughout, which is the point of keeping the two separate: `users.plan` is a
 * database enum, and an account granted Pro must keep resolving to the
 * entitlements it was sold with whether or not the card is on the page.
 *
 * The order matters. `cheapestPlanWith()` walks this list to answer "what is
 * the least a candidate must buy for AI scoring?", so a tier out of price order
 * would send someone to a dearer plan than they need.
 *
 * EVERY TIER HERE NEEDS A RAZORPAY PLAN PER CURRENCY. Adding one means creating
 * the matching plans in the Razorpay dashboard and setting `RAZORPAY_PLAN_<TIER>`
 * (rupees) and `RAZORPAY_PLAN_<TIER>_USD` — the checkout refuses to sell a tier
 * it has no plan id for in the currency being quoted, rather than falling back
 * to another tier's price or to the other currency's plan.
 */
export const OFFERED_PLANS = ["pro", "premium"] as const satisfies readonly Exclude<PlanKey, "free">[];

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

/**
 * The tier's figures in ONE currency — the only way price is ever read.
 *
 * Nothing indexes `PLANS[x].prices` by hand, so adding a currency is one entry
 * per tier rather than a hunt through the pages that render a price. An unknown
 * currency narrows to `DEFAULT_CURRENCY` instead of returning undefined: a
 * missing price renders as "NaN" on a pricing card, which is worse than showing
 * the rupee figure to someone we could not place.
 */
export function priceOf(plan: PlanKey, currency: BillingCurrency = DEFAULT_CURRENCY): Price {
  return PLANS[plan].prices[toBillingCurrency(currency)];
}

/** What one payment costs, in minor units of `currency`. */
export function priceFor(plan: PlanKey, currency: BillingCurrency = DEFAULT_CURRENCY): number {
  return priceOf(plan, currency).priceCents;
}

/** The struck-through "was", or null on a tier that isn't discounted. */
export function listPriceFor(
  plan: PlanKey,
  currency: BillingCurrency = DEFAULT_CURRENCY,
): number | null {
  return priceOf(plan, currency).listPriceCents;
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
 * The denominator in "₹2,499 / 3 months" — what one payment buys, in words.
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

/**
 * "₹2,499" / "₹0" — the pricing page's format, from the one stored number.
 *
 * Grouped the Indian way (₹2,49,900 for a lakh-sized figure, not ₹249,900) with
 * an explicit `en-IN`, never the runtime's locale: the pricing page renders on
 * the server and again in the browser, and a price that formats differently in
 * the two is a hydration mismatch. Whole amounts drop the paise — "₹2,499.00"
 * on a card reads like a bill, not a price.
 */
export function formatPrice(cents: number, currency: string = DEFAULT_CURRENCY): string {
  const amount = cents / 100;
  const whole = Number.isInteger(amount);
  if (currency === "INR") {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }
  const s = whole ? String(amount) : amount.toFixed(2);
  return currency === "USD" ? `$${s}` : `${s} ${currency}`;
}
