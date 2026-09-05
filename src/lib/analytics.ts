/**
 * Client-side conversion events for GA4 and Microsoft Clarity.
 *
 * WHY THIS FILE EXISTS AT ALL
 * ---------------------------
 * The tags in src/components/analytics/analytics.tsx measure PAGE VIEWS, plus
 * whatever GA4's "enhanced measurement" infers on its own (scrolls, outbound
 * clicks, file downloads). That answers "how many people arrived and what did
 * they read" — and nothing else.
 *
 * It cannot answer the question that actually matters: of the people who land
 * on a guide from Google, how many start practising, how many reach /pricing,
 * how many open checkout, and how many pay. Every step of that has to be
 * reported explicitly, because none of it is a navigation — checkout is a modal
 * and the grant happens over fetch, so a page-view funnel shows the drop-off
 * happening at a URL nobody actually left.
 *
 * NAMES ARE GA4'S RECOMMENDED ONES (`sign_up`, `begin_checkout`, `purchase`)
 * rather than invented ones. GA4 gives recommended events dedicated reports and
 * automatic revenue attribution; a custom name called `bought_plan` would need
 * hand-built exploration reports to show the same thing, and would never appear
 * in the Monetisation section at all.
 *
 * EVERYTHING HERE IS A NO-OP WHEN THE TAGS ARE ABSENT — no env id in dev, an ad
 * blocker in production, a crawler. Callers therefore never need to guard, and
 * a missing tag can never throw inside a click handler and break the button it
 * was attached to. That last part is the whole reason this indirection exists
 * instead of calling `window.gtag` from components.
 */

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
    clarity?: (command: string, ...args: unknown[]) => void;
  }
}

type EventParams = Record<string, string | number | boolean | undefined>;

/**
 * Send one event to whichever tags are actually loaded.
 *
 * Wrapped in try/catch because this sits inside click handlers on the payment
 * path: an exception thrown by a third-party tag that loaded half-way must not
 * be what stops a candidate buying a plan. Analytics failing silently is
 * correct here; analytics taking the checkout button down with it is not.
 */
export function track(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", name, params);
    // Clarity's equivalent is a session tag, which is what makes a recording
    // findable later: "show me sessions where checkout_opened fired but
    // purchase never did" is the query that explains a broken funnel.
    window.clarity?.("event", name);
  } catch {
    // Deliberately swallowed — see above.
  }
}

/** A new account was created. The top of every funnel that ends in a sale. */
export function trackSignUp(method = "email"): void {
  track("sign_up", { method });
}

/**
 * Razorpay Checkout was opened. Pair this with `purchase` to see how many
 * candidates open the till and walk away — the single most useful ratio on the
 * site, and one no page-view report can produce because checkout is a modal.
 */
export function trackBeginCheckout(plan: string, priceCents: number, currency: string): void {
  track("begin_checkout", { currency, value: priceCents / 100, items_plan: plan });
}

/**
 * The plan was actually granted server-side. Fired from the confirmation state
 * rather than from Razorpay's callback, so it reflects entitlement, not intent:
 * a payment that succeeded at Razorpay but failed to grant is NOT revenue.
 */
export function trackPurchase(
  plan: string,
  priceCents: number,
  currency: string,
  transactionId?: string,
): void {
  track("purchase", {
    currency,
    value: priceCents / 100,
    items_plan: plan,
    transaction_id: transactionId,
  });
}

/**
 * A candidate started practising. This is the activation step between "read a
 * blog post" and "considered paying", and the one most likely to explain a
 * healthy traffic number sitting next to zero sales.
 */
export function trackPracticeStart(section: string, type?: string): void {
  track("practice_start", { section, type });
}

/** A practice set or mock test was completed and scored. */
export function trackPracticeComplete(section: string, band?: number): void {
  track("practice_complete", { section, band });
}
