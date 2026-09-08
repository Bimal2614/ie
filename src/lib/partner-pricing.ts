import { OFFERED_PLANS, PLANS, priceFor, type BillingCurrency, type OfferedPlan } from "@/lib/plans";

/**
 * What a partner pays, and what it would have cost at list.
 *
 * PURE AND CLIENT-SAFE ON PURPOSE. The panel renders "₹974, was ₹1,299" and the
 * order is opened for ₹974 — and both numbers come from this one function, so
 * the price a class is shown and the price its card is asked for cannot drift
 * apart. The server still computes the amount it sends to Razorpay itself; the
 * browser never names a price, it only renders one.
 */

/** A partner's rate, resolved from its coupon. NULL means list price. */
export type PartnerRate = { code: string; percent: number } | null;

export type Quote = {
  plan: OfferedPlan;
  currency: BillingCurrency;
  /** What the plan costs everyone else, in minor units. */
  listCents: number;
  /** What this partner pays, in minor units. Equal to `listCents` at list. */
  payableCents: number;
  /** 0 when there is no rate — so callers can branch on one field. */
  percent: number;
  code: string | null;
  months: number;
};

/**
 * Minor units per major unit. 100 for both currencies we sell in, which is why
 * rounding to a whole rupee and to a whole dollar is the same arithmetic.
 */
const MINOR = 100;

/**
 * Apply a rate to a price.
 *
 * ROUNDS DOWN TO A WHOLE RUPEE OR DOLLAR. 25% off ₹1,299 is ₹974.25, and an
 * invoice ending in 25 paise looks like a bug to the person paying it. Rounding
 * DOWN rather than to nearest means the arithmetic can only ever favour the
 * class, which is the safe direction to be wrong about someone else's money.
 *
 * The floor of 1 major unit exists so a rate can never produce an order of
 * zero, which Razorpay rejects outright. At the 90% cap this is unreachable
 * with today's prices; it is here because a price change could reach it.
 */
export function applyRate(listCents: number, percent: number): number {
  if (percent <= 0) return listCents;
  const discounted = (listCents * (100 - percent)) / 100;
  return Math.max(MINOR, Math.floor(discounted / MINOR) * MINOR);
}

export function quoteFor(plan: OfferedPlan, currency: BillingCurrency, rate: PartnerRate): Quote {
  const listCents = priceFor(plan, currency);
  return {
    plan,
    currency,
    listCents,
    payableCents: rate ? applyRate(listCents, rate.percent) : listCents,
    percent: rate?.percent ?? 0,
    code: rate?.code ?? null,
    months: PLANS[plan].billingMonths,
  };
}

/** Every plan on sale, priced for this partner. What the pickers render from. */
export function quotesFor(currency: BillingCurrency, rate: PartnerRate): Quote[] {
  return OFFERED_PLANS.map((plan) => quoteFor(plan, currency, rate));
}

/** What the class saves on one seat — for the "you save ₹325" line. */
export function savingOf(quote: Quote): number {
  return quote.listCents - quote.payableCents;
}
