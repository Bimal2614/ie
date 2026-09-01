import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Minimal Razorpay REST client — no SDK, for the same reason src/lib/oauth
 * carries its own Google client: the official package is a thin wrapper over
 * six HTTP calls, and it would be the only dependency in this repo allowed to
 * decide how money is requested.
 *
 * SCOPE: recurring subscriptions only. Razorpay has two unrelated products
 * behind similar names — Orders (charge once) and Subscriptions (a mandate the
 * customer authorises once, which Razorpay then debits every cycle by itself).
 * Everything here is the second. Nothing in this app charges a card on a
 * schedule of its own; Razorpay does that, and tells us it happened over the
 * webhook.
 *
 * Server-only, and the secret never leaves this file: the key id alone is what
 * the browser gets, handed over by the checkout action.
 */

const API = "https://api.razorpay.com/v1";

/** Razorpay's shape when a call fails. Its `description` is human-readable. */
type RazorpayErrorBody = {
  error?: { code?: string; description?: string; field?: string; reason?: string };
};

/**
 * A failed Razorpay call, carrying what the gateway actually said.
 *
 * The description is deliberately preserved rather than flattened to "payment
 * failed": the two errors this integration is most likely to meet in the wild —
 * a currency the account is not approved for, and a test/live key mismatch —
 * are both diagnosable from that string and from nothing else. Callers decide
 * what a candidate is allowed to see, and the checkout action shows them none
 * of it.
 */
export class RazorpayApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    readonly description: string,
  ) {
    super(`Razorpay ${status}${code ? ` ${code}` : ""}: ${description}`);
    this.name = "RazorpayApiError";
  }
}

function authHeader(): string {
  const id = env.RAZORPAY_KEY_ID;
  const secret = env.RAZORPAY_KEY_SECRET;
  // Callers gate on isRazorpayConfigured(); this is the backstop that stops a
  // half-configured deployment sending "Basic dW5kZWZpbmVkOnVuZGVmaW5lZA==".
  if (!id || !secret) throw new Error("Razorpay is not configured");
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    // Money calls are never served from a cache, and Next will happily add one.
    cache: "no-store",
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // A non-JSON body from an API that only speaks JSON means a proxy or an
    // outage answered instead. Fall through with the raw text as the message.
  }

  if (!res.ok) {
    const err = (parsed as RazorpayErrorBody | null)?.error;
    throw new RazorpayApiError(
      res.status,
      err?.code,
      err?.description ?? (text ? text.slice(0, 300) : "no response body"),
    );
  }
  return parsed as T;
}

/* ------------------------------------------------------------------ *
 * Cadence
 * ------------------------------------------------------------------ */

export type Cadence = { period: "monthly" | "yearly"; interval: number };

/**
 * Our "how many months does one payment buy" as Razorpay's period + interval.
 *
 * Razorpay has no "every 3 months" period; it has `monthly` with an interval of
 * 3, which is the same thing said differently. Whole years become `yearly`
 * rather than 12-month intervals because Razorpay caps how many cycles a plan
 * may run for, and a yearly plan buys far more runway inside that cap.
 */
export function cadenceFor(billingMonths: number): Cadence {
  if (billingMonths <= 0) throw new Error(`cadenceFor: ${billingMonths} months is not a term`);
  return billingMonths % 12 === 0
    ? { period: "yearly", interval: billingMonths / 12 }
    : { period: "monthly", interval: billingMonths };
}

/**
 * How many cycles to authorise the mandate for.
 *
 * `total_count` is REQUIRED by Razorpay and there is no "until cancelled"
 * value — a subscription always has a last cycle, and Razorpay caps that count
 * per period. We ask for ten years' worth, clamped to the cap: long enough that
 * no real customer reaches the end, short enough to be a number rather than a
 * claim of perpetuity.
 *
 * Reaching it fires `subscription.completed`, which the webhook treats as an
 * ordinary ending — the account lapses to free at its last paid period like any
 * other, rather than being cut off mid-term.
 */
export function cycleCount({ period, interval }: Cadence): number {
  const cap = period === "yearly" ? 100 : 1200;
  const perYear = period === "yearly" ? 1 / interval : 12 / interval;
  return Math.max(1, Math.min(cap, Math.ceil(perYear * 10)));
}

/* ------------------------------------------------------------------ *
 * Objects
 * ------------------------------------------------------------------ */

export type RazorpayPlan = {
  id: string;
  period: string;
  interval: number;
  /** The price, welded in at creation. `amount` is in minor units. */
  item: { name?: string; amount: number; currency: string };
};

export type RazorpayCustomer = { id: string; email?: string; contact?: string };

export type RazorpaySubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "completed"
  | "expired"
  | "paused";

export type RazorpaySubscription = {
  id: string;
  plan_id: string;
  customer_id?: string;
  status: RazorpaySubscriptionStatus;
  /** Unix SECONDS, and null before the first charge. The paid window. */
  current_start: number | null;
  current_end: number | null;
  charge_at: number | null;
  ended_at: number | null;
  total_count: number;
  paid_count: number;
  notes?: Record<string, string>;
};

/**
 * Read back a plan created in the Razorpay dashboard.
 *
 * THERE IS DELIBERATELY NO `createPlan` HERE. Plans are managed by hand in the
 * dashboard and their ids come from the environment, because a Razorpay plan is
 * immutable and undeletable: code that mints one per price change leaves a
 * permanent trail of near-identical plans, and a typo'd amount in a deploy
 * becomes a junk plan that can never be cleaned up. What this integration does
 * instead is read the plan and refuse to sell against it if its terms disagree
 * with what the pricing page is advertising — see `resolvePlanTerms`.
 */
export function fetchPlan(id: string): Promise<RazorpayPlan> {
  return call<RazorpayPlan>(`/plans/${encodeURIComponent(id)}`);
}

/**
 * Find or create the Razorpay customer for an account.
 *
 * `fail_existing: 0` is what makes this idempotent: with it, an email Razorpay
 * has seen before comes back as the existing customer instead of a 400, so a
 * candidate who subscribes, lapses and returns keeps one record rather than
 * collecting one per attempt.
 */
export function createCustomer(input: {
  name: string;
  email: string;
  contact?: string | null;
}): Promise<RazorpayCustomer> {
  return call<RazorpayCustomer>("/customers", {
    method: "POST",
    body: {
      name: input.name,
      email: input.email,
      ...(input.contact ? { contact: input.contact } : {}),
      fail_existing: 0,
    },
  });
}

/**
 * Open a subscription in `created` state, ready for Checkout to authorise.
 *
 * `notes` carries our own user id and tier. That is not decoration: it is how a
 * webhook arriving before — or instead of — the browser's callback knows whose
 * account to grant. Razorpay echoes notes back on every event for the
 * subscription's whole life.
 */
export function createSubscription(input: {
  planId: string;
  customerId: string;
  totalCount: number;
  notes: Record<string, string>;
}): Promise<RazorpaySubscription> {
  return call<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: {
      plan_id: input.planId,
      customer_id: input.customerId,
      total_count: input.totalCount,
      quantity: 1,
      // Razorpay emails the customer the mandate and each charge. Left on: a
      // recurring debit nobody was told about is how chargebacks start.
      customer_notify: 1,
      notes: input.notes,
    },
  });
}

export function fetchSubscription(id: string): Promise<RazorpaySubscription> {
  return call<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(id)}`);
}

/**
 * Stop future debits.
 *
 * `atCycleEnd` is the difference between "cancel" and "refund": at cycle end
 * the mandate runs to the end of the period the customer already paid for and
 * simply does not renew, which is what a Cancel button means and what the
 * pricing page's "Cancel anytime" promises. Immediate cancellation ends it now
 * and is for a refund or a revoke, where entitlement is being taken away.
 */
export function cancelSubscription(
  id: string,
  atCycleEnd: boolean,
): Promise<RazorpaySubscription> {
  return call<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: { cancel_at_cycle_end: atCycleEnd ? 1 : 0 },
  });
}

/* ------------------------------------------------------------------ *
 * Signatures
 *
 * Two different secrets sign two different things, and mixing them up is the
 * classic way to ship a checkout that verifies nothing:
 *   - the CHECKOUT handler's signature is signed with the API key secret
 *   - the WEBHOOK body is signed with the webhook secret from the dashboard
 * ------------------------------------------------------------------ */

/** Constant-time compare of two hex digests. */
function digestMatches(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  // Unequal lengths mean it is not a SHA-256 hex digest at all; timingSafeEqual
  // throws on those, and the length itself is not a secret.
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/**
 * Verify what Razorpay Checkout handed the browser.
 *
 * NOTE THE ORDER: for a SUBSCRIPTION the payload signed is
 * `payment_id|subscription_id`, the reverse of the `order_id|payment_id` used
 * for one-off orders. Getting it backwards fails closed — every real payment is
 * rejected — which is the safe way to be wrong, but it is also the first thing
 * to check if nothing ever activates.
 */
export function verifyCheckoutSignature(input: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): boolean {
  const secret = env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${input.paymentId}|${input.subscriptionId}`)
    .digest("hex");
  return digestMatches(expected, input.signature);
}

/**
 * Verify a webhook delivery against the RAW request body.
 *
 * The body must be the exact bytes Razorpay sent — re-serialising the parsed
 * JSON reorders keys and changes whitespace, and the digest then never matches.
 * That is why the webhook route reads `await request.text()` and parses only
 * afterwards.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return digestMatches(expected, signature);
}

/** Razorpay speaks unix seconds; the rest of this app speaks Date. */
export function fromUnix(seconds: number | null | undefined): Date | null {
  return typeof seconds === "number" && Number.isFinite(seconds) ? new Date(seconds * 1000) : null;
}
