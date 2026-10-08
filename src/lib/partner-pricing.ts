import { formatPrice, OFFERED_PLANS, PLANS, priceFor, type BillingCurrency, type OfferedPlan } from "@/lib/plans";

/**
 * What a partner pays, and what it would have cost at list.
 *
 * PURE AND CLIENT-SAFE ON PURPOSE. The panel renders "₹2,599, was ₹2,999" and the
 * order is opened for ₹2,599 — and both numbers come from this one function, so
 * the price a class is shown and the price its card is asked for cannot drift
 * apart. The server still computes the amount it sends to Razorpay itself; the
 * browser never names a price, it only renders one.
 */

/**
 * A partner's rate, resolved from its coupon. NULL means list price.
 *
 * A fixed amount off per currency, in minor units. NULL for a currency means
 * the coupon gives nothing off in it — a class paying in USD on a rupees-only
 * deal pays list.
 */
export type PartnerRate = { code: string; amountCents: Record<BillingCurrency, number | null> } | null;

export type Quote = {
  plan: OfferedPlan;
  currency: BillingCurrency;
  /** What the plan costs everyone else, in minor units. */
  listCents: number;
  /** What this partner pays, in minor units. Equal to `listCents` at list. */
  payableCents: number;
  /** What the rate takes off, in minor units. 0 at list — so callers can branch on one field. */
  discountCents: number;
  code: string | null;
  months: number;
};

/**
 * The plans a partner rate applies to. Pro is always sold at list, to partners
 * as to everyone — the deal is on Premium only.
 */
export const DISCOUNTED_PLANS: readonly OfferedPlan[] = ["premium"];

/**
 * Minor units per major unit. 100 for both currencies we sell in, which is why
 * rounding to a whole rupee and to a whole dollar is the same arithmetic.
 */
const MINOR = 100;

/**
 * Take a fixed amount off a price.
 *
 * The floor of 1 major unit exists so a rate can never produce an order of
 * zero, which Razorpay rejects outright. The coupon form refuses an amount at or
 * above the cheapest discounted plan, so this is unreachable with today's prices; it is
 * here because a price cut could reach it.
 */
export function applyRate(listCents: number, offCents: number): number {
  if (offCents <= 0) return listCents;
  return Math.max(MINOR, listCents - offCents);
}

export function quoteFor(plan: OfferedPlan, currency: BillingCurrency, rate: PartnerRate): Quote {
  const listCents = priceFor(plan, currency);
  const offCents = DISCOUNTED_PLANS.includes(plan) ? (rate?.amountCents[currency] ?? 0) : 0;
  const payableCents = applyRate(listCents, offCents);
  return {
    plan,
    currency,
    listCents,
    payableCents,
    discountCents: listCents - payableCents,
    code: rate?.code ?? null,
    months: PLANS[plan].billingMonths,
  };
}

/** Every plan on sale, priced for this partner. What the pickers render from. */
export function quotesFor(currency: BillingCurrency, rate: PartnerRate): Quote[] {
  return OFFERED_PLANS.map((plan) => quoteFor(plan, currency, rate));
}

/** What the class saves on one seat — for the "you save ₹400" line. */
export function savingOf(quote: Quote): number {
  return quote.discountCents;
}

/** "₹400 off · $5 off Premium" — how a coupon reads on the admin screens. */
export function describeRate(amounts: { amountInrCents: number; amountUsdCents: number | null }): string {
  const inr = `${formatPrice(amounts.amountInrCents, "INR")} off`;
  const both = amounts.amountUsdCents ? `${inr} · ${formatPrice(amounts.amountUsdCents, "USD")} off` : inr;
  return `${both} ${DISCOUNTED_PLANS.map((p) => PLANS[p].label).join(" & ")}`;
}
