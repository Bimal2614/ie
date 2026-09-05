import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { allowPlanMismatch, env, razorpayPlanIdFor } from "@/lib/env";
import {
  DEFAULT_CURRENCY,
  PLANS,
  priceFor,
  toBillingCurrency,
  toPlanKey,
  type BillingCurrency,
  type PlanKey,
} from "@/lib/plans";
import {
  cadenceFor,
  cancelSubscription,
  createCustomer,
  fetchPlan,
  createSubscription,
  cycleCount,
  fetchSubscription,
  fromUnix,
  type Cadence,
  type RazorpaySubscription,
} from "@/lib/payments/razorpay";
import {
  currentSubscription,
  grantPlan,
  logBillingEvent,
  periodEndFor,
  renewSubscription,
  subscriptionByProviderId,
} from "@/lib/subscriptions";

/**
 * Everything between "a candidate pressed Subscribe" and "the ledger says they
 * are on Premium".
 *
 * THE BROWSER AND THE WEBHOOK RUN THE SAME CODE. Razorpay tells us a
 * subscription was paid for twice over — once when Checkout hands the page a
 * signed callback, and again over the webhook — and either can arrive first,
 * late, or not at all. Two implementations of "activate this" would be two
 * chances to disagree about what the customer bought, so both paths call
 * `activateFromRazorpay` below and it is written to be safe to run repeatedly.
 *
 * NOTHING HERE TRUSTS THE BROWSER for what was purchased. The callback supplies
 * three ids and a signature; the tier, the amount and the paid window are then
 * read back from Razorpay's own copy of the subscription. A tampered callback
 * can therefore claim only that a payment it cannot forge a signature for
 * happened — never that it was for a plan nobody paid for.
 */

/* ------------------------------------------------------------------ *
 * The Razorpay plan: read from the dashboard, never written
 * ------------------------------------------------------------------ */

/**
 * The plan is missing from the environment, or does not say what the pricing
 * page says.
 *
 * A DISTINCT TYPE because it is a distinct problem: a `RazorpayApiError` means
 * the gateway is unhappy and retrying later may work, while this means the
 * deployment is misconfigured and no amount of retrying will fix it. The
 * checkout action logs this one at error level and tells the candidate to
 * contact us, rather than inviting them to try again forever.
 */
export class PlanConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanConfigError";
  }
}

type PlanTerms = {
  razorpayPlanId: string;
  amount: number;
  currency: string;
  cadence: Cadence;
};

/** What the ledger records for a currency Razorpay charged in. */
function currencyOf(sub: RazorpaySubscription): BillingCurrency {
  return toBillingCurrency(sub.notes?.currency);
}

/**
 * The dashboard-created plan for a tier, checked against what we advertise.
 *
 * PLANS ARE MANAGED IN THE RAZORPAY DASHBOARD, not by this code. That is the
 * right call for an object Razorpay makes immutable and offers no way to
 * delete: creating one per price change would leave a permanent drift of
 * near-identical plans, and a mistyped amount in a deploy would mint a junk
 * plan forever. So the id comes from the environment (see `razorpayPlanIdFor`)
 * and a human owns it.
 *
 * WHAT THIS FUNCTION IS FOR IS THE OTHER HALF OF THAT BARGAIN. Once the price
 * lives in two places — `priceCents` in src/lib/plans.ts, which the pricing
 * page renders, and the Razorpay plan, which the card is actually charged —
 * they can disagree, and the failure is silent and expensive: the page offers
 * Premium at $35 and Razorpay debits $40, or the reverse. So the plan is read
 * back and every term compared, and a mismatch REFUSES THE SALE rather than
 * charging an amount the customer was never shown.
 *
 * Verified per checkout. It is one GET against an endpoint that is already
 * being called twice more in the same flow, and caching it would mean a price
 * corrected in the dashboard stayed wrong here until something evicted it.
 */
export async function resolvePlanTerms(
  plan: Exclude<PlanKey, "free">,
  currency: BillingCurrency = DEFAULT_CURRENCY,
): Promise<PlanTerms> {
  const entitlements = PLANS[plan];
  const planId = razorpayPlanIdFor(plan, currency);
  if (!planId) {
    /*
     * No plan for this tier IN THIS CURRENCY.
     *
     * Never falls through to the other currency's plan: the rupee plan charges
     * ₹2,499 to a card that was quoted $29, which is the mis-charge this whole
     * function exists to prevent. Refusing is the correct failure, and the
     * pricing page's currency switch hides a currency in this state anyway —
     * reaching here means the environment changed since the page was rendered.
     */
    const suffix = currency === DEFAULT_CURRENCY ? "" : `_${currency}`;
    throw new PlanConfigError(
      `No Razorpay plan id configured for "${plan}" in ${currency}. Create the plan in the Razorpay dashboard and set RAZORPAY_PLAN_${plan.toUpperCase()}${suffix}.`,
    );
  }

  const expected = {
    amount: priceFor(plan, currency),
    currency,
    cadence: cadenceFor(entitlements.billingMonths),
  };

  const actual = await fetchPlan(planId);

  /*
   * Every term, not just the amount.
   *
   * A plan with the right price on the wrong cadence is the subtler bug and the
   * worse one: $35 monthly instead of $35 quarterly bills a customer three
   * times what the page promised, and nothing about the first charge looks
   * wrong.
   */
  const mismatches: string[] = [];
  if (actual.item?.amount !== expected.amount) {
    mismatches.push(`amount ${actual.item?.amount} != ${expected.amount}`);
  }
  if (actual.item?.currency !== expected.currency) {
    mismatches.push(`currency ${actual.item?.currency} != ${expected.currency}`);
  }
  if (actual.period !== expected.cadence.period) {
    mismatches.push(`period ${actual.period} != ${expected.cadence.period}`);
  }
  if (actual.interval !== expected.cadence.interval) {
    mismatches.push(`interval ${actual.interval} != ${expected.cadence.interval}`);
  }

  if (mismatches.length > 0) {
    /*
     * The ₹1 test-plan path.
     *
     * Only ever reachable on TEST keys (see `allowPlanMismatch`), where no real
     * money moves and the point is to exercise checkout, the webhook and the
     * renewal without paying ₹2,499 a go. The ACTUAL terms are returned rather
     * than the advertised ones, so the ledger records what was really charged
     * instead of a price nobody paid — a test purchase should look like a ₹1
     * test purchase in the billing history forever after, not like a full one.
     *
     * Logged at warn on every checkout, deliberately noisily: a mismatch left
     * switched on is a thing you want to trip over in the logs, not discover
     * from a customer.
     */
    if (allowPlanMismatch()) {
      console.warn(
        `[razorpay] PLAN MISMATCH ALLOWED (test keys): ${planId} will charge ` +
          `${actual.item?.amount} ${actual.item?.currency} every ${actual.interval} ${actual.period}, ` +
          `while /pricing advertises "${plan}" at ${expected.amount} ${expected.currency}. ` +
          `[${mismatches.join("; ")}]`,
      );
      return {
        razorpayPlanId: planId,
        amount: actual.item.amount,
        currency: actual.item.currency,
        cadence: { period: actual.period as Cadence["period"], interval: actual.interval },
      };
    }

    throw new PlanConfigError(
      `Razorpay plan ${planId} does not match what /pricing advertises for "${plan}" in ${currency} (${mismatches.join("; ")}). ` +
        `Fix the plan in the dashboard, or the figures in src/lib/plans.ts, so the price shown is the price charged.`,
    );
  }

  return {
    razorpayPlanId: planId,
    amount: expected.amount,
    currency: expected.currency,
    cadence: expected.cadence,
  };
}

/* ------------------------------------------------------------------ *
 * The customer
 * ------------------------------------------------------------------ */

/** The account's `cust_…`, created on first checkout and cached on the user row. */
async function ensureCustomerId(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}): Promise<string> {
  const [row] = await db
    .select({ razorpayCustomerId: users.razorpayCustomerId })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (row?.razorpayCustomerId) return row.razorpayCustomerId;

  const customer = await createCustomer({
    name: user.name,
    email: user.email,
    contact: user.phone,
  });

  await db
    .update(users)
    .set({ razorpayCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return customer.id;
}

/**
 * The account a `cust_…` belongs to, or null if we have never seen it.
 *
 * THE LAST WAY BACK TO AN OWNER, and for some events the only one. Razorpay's
 * `notes` are a property of the SUBSCRIPTION, and a `payment.failed` for a
 * subscription charge carries neither the subscription entity nor a copy of its
 * notes — the payment's own `notes` come through empty. What it does carry is
 * `customer_id`, and `ensureCustomerId` above wrote that onto the user the
 * moment the checkout was opened, so the column is a reverse index into the
 * accounts by the one handle the event actually has.
 *
 * Reads the cached column rather than asking Razorpay for the customer: the id
 * is ours, written by us, and a gateway round trip in a webhook is a retry
 * waiting to happen.
 */
export async function userIdByCustomerId(customerId: string | null | undefined): Promise<string | null> {
  if (!customerId) return null;
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.razorpayCustomerId, customerId))
    .limit(1);
  return row?.id ?? null;
}

/* ------------------------------------------------------------------ *
 * Opening a checkout
 * ------------------------------------------------------------------ */

export type CheckoutSession = {
  /** Razorpay's `sub_…`, which Checkout is opened against. */
  subscriptionId: string;
  /** The PUBLIC key. The secret never reaches the browser. */
  keyId: string;
  /** Copy for the Checkout modal, so the amount is not re-typed in the client. */
  planLabel: string;
  description: string;
  amount: number;
  currency: string;
  prefill: { name: string; email: string; contact: string };
};

/**
 * Create the subscription Checkout will authorise, and hand the browser exactly
 * what it needs to open the modal — no more.
 *
 * NOTHING IS CHARGED HERE and no entitlement is granted: the row that comes
 * back is in Razorpay's `created` state, which is an offer to pay. The account
 * moves only once a signed payment comes back through `activateFromRazorpay`.
 */
export async function openCheckout(
  user: { id: string; name: string; email: string; phone: string | null },
  plan: Exclude<PlanKey, "free">,
  currency: BillingCurrency = DEFAULT_CURRENCY,
): Promise<CheckoutSession> {
  const terms = await resolvePlanTerms(plan, currency);
  const customerId = await ensureCustomerId(user);
  const entitlements = PLANS[plan];

  const subscription = await createSubscription({
    planId: terms.razorpayPlanId,
    customerId,
    totalCount: cycleCount(terms.cadence),
    // Echoed back on every event this subscription ever raises. The webhook
    // reads the account out of here, which is what lets a renewal three months
    // from now find its owner without a browser session to ask — and the
    // CURRENCY too, so a renewal in 2027 records dollars against a dollar
    // mandate instead of stamping the default on it.
    notes: { userId: user.id, planKey: plan, currency: terms.currency },
  });

  return {
    subscriptionId: subscription.id,
    keyId: env.RAZORPAY_KEY_ID!,
    planLabel: entitlements.label,
    description: `${entitlements.label} — billed every ${entitlements.billingMonths} month(s)`,
    amount: terms.amount,
    currency: terms.currency,
    prefill: { name: user.name, email: user.email, contact: user.phone ?? "" },
  };
}

/* ------------------------------------------------------------------ *
 * Activation — the shared path
 * ------------------------------------------------------------------ */

/** What Razorpay's notes must contain for an event to be actionable. */
function ownerOf(sub: RazorpaySubscription): { userId: string; plan: Exclude<PlanKey, "free"> } | null {
  const userId = sub.notes?.userId;
  const plan = toPlanKey(sub.notes?.planKey);
  // A subscription created outside this app (by hand in the dashboard, say) has
  // no notes and no account to grant. Ignoring it beats guessing at one.
  if (!userId || plan === "free") return null;
  return { userId, plan };
}

/**
 * The paid window, as Razorpay reports it.
 *
 * PREFERRED OVER OUR OWN ARITHMETIC, always. `current_end` is the date the
 * customer's next debit is scheduled against, so taking it verbatim is what
 * keeps our expiry and their bank statement telling the same story — and it is
 * what makes a redelivered webhook harmless, since re-applying the same window
 * changes nothing. The computed fallback covers the gap right after checkout,
 * where Razorpay can report a subscription as paid before it has stamped the
 * cycle dates on it.
 */
function windowOf(
  sub: RazorpaySubscription,
  plan: Exclude<PlanKey, "free">,
): { start: Date; end: Date } {
  const start = fromUnix(sub.current_start) ?? new Date();
  const end = fromUnix(sub.current_end) ?? periodEndFor(start, PLANS[plan].billingMonths);
  return { start, end };
}

/**
 * Cancel any OTHER Razorpay mandate this account still has running.
 *
 * A candidate who subscribes again while an old subscription is live would
 * otherwise be debited by two mandates forever: `grantPlan` closes the old row
 * here, but Razorpay has never heard of that and keeps charging. Best-effort on
 * purpose — the new subscription is already paid for, and a gateway that is
 * briefly unreachable must not fail the activation. What is left behind is a
 * double charge, which is recoverable; refusing to activate a paid plan is a
 * customer who paid and got nothing.
 */
async function cancelSupersededMandates(userId: string, keepSubscriptionId: string): Promise<void> {
  const rows = await db
    .select({ id: subscriptions.providerSubscriptionId })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.provider, "razorpay"),
        // Only what is still granting. A subscription that already ended has
        // nothing left to debit, and asking Razorpay to cancel it again just
        // trades an API call for an error in the log.
        inArray(subscriptions.status, ["active", "cancelling", "past_due"]),
      ),
    );

  for (const row of rows) {
    if (!row.id || row.id === keepSubscriptionId) continue;
    try {
      await cancelSubscription(row.id, false);
    } catch (error) {
      // Already cancelled or completed at Razorpay is the common case here and
      // is not a problem; anything else is worth seeing in the logs.
      console.warn(`[razorpay] could not cancel superseded ${row.id}:`, error);
    }
  }
}

/**
 * True when this row has been REPLACED by a newer subscription on the account.
 *
 * The guard on every late-arriving event, and the reason it is needed: Razorpay
 * keeps talking about a subscription after we have moved on from it. A customer
 * who cancels and resubscribes has two rows, and the old one still has a
 * `subscription.cancelled` and possibly a final `subscription.charged` in
 * flight. Acting on those would reach past the row the event is about and hit
 * whatever is live now — cancelling the subscription they just bought, or
 * reviving a dead one alongside it so that "what are they on?" has two answers.
 *
 * A user with no live subscription at all is NOT superseded: that is the lapsed
 * account whose renewal has finally landed, and it should be brought back.
 */
export async function supersededLocally(sub: { id: string; userId: string }): Promise<boolean> {
  const live = await currentSubscription(sub.userId);
  return Boolean(live) && live!.id !== sub.id;
}

export type ActivationResult =
  | { ok: true; plan: Exclude<PlanKey, "free">; entitledUntil: Date }
  | { ok: false; reason: "unknown_subscription" | "not_paid" | "no_owner" | "superseded" };

/**
 * Bring the local record into line with a Razorpay subscription that has been
 * paid for. Safe to call as often as it is told to.
 *
 * Called by the checkout callback (with a verified signature behind it) and by
 * the `subscription.charged` webhook. The subscription is re-read from Razorpay
 * rather than taken from either caller, so both are asserting only "look at
 * this subscription again", which is a request neither can abuse.
 */
export async function activateFromRazorpay(input: {
  subscriptionId: string;
  /** The payment behind this activation, for the ledger. */
  paymentId?: string | null;
  /** What was actually charged, when the caller knows (the webhook does). */
  amountCents?: number | null;
  actor: "user" | "webhook";
}): Promise<ActivationResult> {
  const sub = await fetchSubscription(input.subscriptionId);

  // `created` means the mandate was never authorised — an abandoned checkout.
  // `active`/`authenticated` are the two states a paid-for subscription passes
  // through; the rest are endings, handled by their own webhook branches.
  if (sub.status !== "active" && sub.status !== "authenticated") {
    return { ok: false, reason: "not_paid" };
  }

  const owner = ownerOf(sub);
  if (!owner) return { ok: false, reason: "no_owner" };

  const { start, end } = windowOf(sub, owner.plan);
  /*
   * What was charged and in what.
   *
   * The currency comes off the mandate's own notes, stamped when the checkout
   * was opened — not from a default and not from the request, which by renewal
   * time is a Razorpay server in another country. An amount in cents recorded
   * against "INR" is a refund figure out by ~90x, and it is the ledger, so it
   * is wrong forever.
   */
  const currency = currencyOf(sub);
  const amountCents = input.amountCents ?? priceFor(owner.plan, currency);
  const metadata = {
    razorpaySubscriptionId: sub.id,
    razorpayPlanId: sub.plan_id,
    razorpayPaymentId: input.paymentId ?? null,
    paidCount: sub.paid_count,
  };

  const existing = await subscriptionByProviderId(sub.id);

  if (existing) {
    // A charge for a subscription the account has already moved on from. Rolling
    // its window forward would leave two rows granting at once, with the older
    // one's expiry overwriting the newer one's on the user.
    if (await supersededLocally(existing)) return { ok: false, reason: "superseded" };

    // Every charge after the first lands here, and so does a redelivery of the
    // first — writing the same window twice is a no-op by design.
    await renewSubscription(existing.id, {
      periodStart: start,
      periodEnd: end,
      amountCents,
      actor: input.actor === "user" ? "user" : "webhook",
      note: `Razorpay charge ${sub.paid_count} of ${sub.total_count}`,
      metadata,
    });
    return { ok: true, plan: toPlanKey(existing.plan) as Exclude<PlanKey, "free">, entitledUntil: end };
  }

  await cancelSupersededMandates(owner.userId, sub.id);

  await grantPlan({
    userId: owner.userId,
    plan: owner.plan,
    startsAt: start,
    periodEnd: end,
    priceCents: amountCents,
    currency,
    actor: input.actor === "user" ? "user" : "webhook",
    provider: "razorpay",
    providerSubscriptionId: sub.id,
    providerPlanId: sub.plan_id,
    note: "Razorpay subscription activated",
    metadata,
  });

  return { ok: true, plan: owner.plan, entitledUntil: end };
}

/* ------------------------------------------------------------------ *
 * Ending one
 * ------------------------------------------------------------------ */

/**
 * Stop the mandate at Razorpay for a subscription we hold locally.
 *
 * THE GATEWAY GOES FIRST, and a failure is propagated rather than swallowed.
 * Recording a cancellation we did not actually manage to place is how an
 * account ends up marked "cancelling" in our database while the card keeps
 * being debited every quarter — the one outcome worse than an error message.
 * The caller records the local side only once this returns.
 */
export async function cancelMandate(
  providerSubscriptionId: string,
  atCycleEnd = true,
): Promise<void> {
  await cancelSubscription(providerSubscriptionId, atCycleEnd);
}

/** Record a payment that failed, for the ledger. Changes no entitlement. */
export async function recordFailedPayment(input: {
  userId: string;
  subscriptionId: string | null;
  amountCents: number | null;
  /** What the gateway said it tried to take, when the event carries it. */
  currency?: string | null;
  note: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await logBillingEvent({
    userId: input.userId,
    subscriptionId: input.subscriptionId,
    event: "payment_failed",
    actor: "webhook",
    amountCents: input.amountCents,
    currency: toBillingCurrency(input.currency),
    note: input.note,
    metadata: input.metadata,
  });
}
