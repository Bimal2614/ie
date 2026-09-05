import "server-only";

import { headers } from "next/headers";
import { env, isCurrencyOnSale, isProd } from "@/lib/env";
import { DEFAULT_CURRENCY, toBillingCurrency, type BillingCurrency } from "@/lib/plans";

/**
 * Which currency this request is quoted in.
 *
 * ONE ANSWER PER REQUEST, READ BY BOTH SIDES. The pricing page renders a figure
 * and the checkout action creates a subscription against a Razorpay plan, and
 * those two must never disagree — so both call this, on the same request, with
 * the same headers, instead of one guessing in the browser and the other
 * guessing again on the server. What the visitor may then do is OVERRIDE it
 * with the currency switch, and that choice travels to the action explicitly;
 * see `startCheckout`.
 *
 * THE HEADER IS THE ONLY SIGNAL. Not the account's `country` (free text a
 * candidate types, "Indian" as often as "India"), and not the phone's calling
 * code — a signed-out visitor reading the pricing page has neither, so a rule
 * built on them would quote one price before sign-in and a different one after,
 * which is the exact failure the price check in src/lib/payments/billing.ts
 * exists to prevent.
 */

/**
 * Where the CDN writes the caller's country, in the order we trust them.
 *
 * Vercel's header is the one that is actually set in production; the others are
 * there so a deployment moved behind Cloudflare, or fronted by a proxy of our
 * own, keeps working rather than silently quoting rupees to the world. All are
 * ISO 3166-1 alpha-2, or the literal "XX" when the edge could not place the IP.
 */
const COUNTRY_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
  "x-geo-country",
] as const;

/** Countries billed in rupees. Everywhere else is quoted the USD plans. */
const INR_COUNTRIES = new Set(["IN"]);

/**
 * The caller's ISO country, or null when nothing placed them.
 *
 * "XX" is Vercel's own "unknown", and an empty string is what a proxy that
 * forwards the header without setting it produces; both mean the same thing as
 * the header being absent, and all three must land on the fallback rather than
 * on a country code of `""`.
 */
export async function requestCountry(): Promise<string | null> {
  // A local override, so the international price can be exercised on a laptop
  // where no edge has written a header. Ignored in production: a currency
  // decided by an environment variable rather than by the caller would quote
  // every real customer the same price whatever their country.
  if (!isProd && env.BILLING_TEST_COUNTRY) {
    return env.BILLING_TEST_COUNTRY.trim().toUpperCase();
  }

  const h = await headers();
  for (const name of COUNTRY_HEADERS) {
    const value = h.get(name)?.trim().toUpperCase();
    if (value && value !== "XX" && /^[A-Z]{2}$/.test(value)) return value;
  }
  return null;
}

/**
 * The currency to quote this request in, before any choice the visitor makes.
 *
 * FALLS BACK TO RUPEES, always: every Razorpay account can charge INR, so a
 * lookup that fails produces a price that can actually be paid. Quoting dollars
 * to an unplaceable visitor is the worse half of the same coin — an Indian card
 * shown $29 is declined at the gateway, and the candidate is told nothing more
 * useful than "payment failed".
 *
 * A currency with no Razorpay plans behind it is NOT offered, however the
 * caller was geolocated. That is what makes shipping this before the dollar
 * plans exist safe: until `RAZORPAY_PLAN_*_USD` are set, everyone sees rupees.
 */
export async function resolveBillingCurrency(): Promise<BillingCurrency> {
  const country = await requestCountry();
  const wanted: BillingCurrency = country && !INR_COUNTRIES.has(country) ? "USD" : DEFAULT_CURRENCY;
  return isCurrencyOnSale(wanted) ? wanted : DEFAULT_CURRENCY;
}

/**
 * The currency a checkout will actually be opened in.
 *
 * The browser names one — the visitor may have pressed the ₹/$ switch, and
 * their choice must be honoured or the switch is decoration. It is NOT trusted
 * beyond that: it is narrowed to a currency we sell, checked against the plans
 * that exist, and the AMOUNT is never taken from the browser at all — it comes
 * from the plans table and is verified against Razorpay's own copy of the plan
 * before anything is charged.
 */
export async function checkoutCurrency(requested: unknown): Promise<BillingCurrency> {
  const wanted = toBillingCurrency(requested);
  if (isCurrencyOnSale(wanted)) return wanted;
  // Named a currency we cannot sell (an old tab, a hand-made request, or the
  // USD plans being unset since the page was rendered). Fall back to what the
  // request itself says rather than refusing: rupees are always sellable.
  return resolveBillingCurrency();
}
