import "server-only";

import { PLANS, toPlanKey, type PlanKey } from "@/lib/plans";
import { grantPlan, renewSubscription, subscriptionByProviderId } from "@/lib/subscriptions";
import { recordCharge } from "@/lib/payments/transactions";
import { supersededLocally } from "@/lib/payments/billing";
import { isProd } from "@/lib/env";
import type { VerifiedPurchase } from "@/lib/payments/iap/types";

/**
 * Bring the local record into line with a VERIFIED store purchase.
 *
 * The in-app-purchase counterpart of `activateFromRazorpay`, and deliberately
 * the same shape: take a purchase the provider has confirmed, write the
 * subscription, write the ledger row, return what the account is now entitled
 * to. Safe to call as often as it is told to — the first purchase, a renewal
 * notification, a redelivered notification and a "restore purchases" tap from
 * the app all land here and the second and later ones are no-ops.
 *
 * ENTITLEMENT DOES NOT DEPEND ON WHO SOLD IT. A candidate who buys Premium in
 * the app and one who buys it on the website get the same row in the same table
 * and pass the same gates; only `provider` differs. That is what lets someone
 * subscribe on a laptop and be recognised on their phone.
 */

export type IapActivationResult =
  | { ok: true; plan: Exclude<PlanKey, "free">; entitledUntil: Date; renewed: boolean }
  | { ok: false; reason: "not_active" | "sandbox_in_production" | "superseded" };

export async function activateFromStore(
  userId: string,
  purchase: VerifiedPurchase,
): Promise<IapActivationResult> {
  /**
   * A SANDBOX PURCHASE MUST NOT GRANT A PLAN ON THE PRODUCTION DEPLOYMENT.
   *
   * Apple's sandbox receipts are free and anyone with a developer account can
   * mint one, so honouring them in production would be an open door to Premium.
   * They are honoured on non-production deployments, because that is precisely
   * what they are for.
   */
  if (purchase.sandbox && isProd) {
    return { ok: false, reason: "sandbox_in_production" };
  }

  // Expired, refunded, revoked, or on hold at the store's end. Nothing to grant.
  if (!purchase.active) return { ok: false, reason: "not_active" };

  const day = (d: Date) => d.toISOString().slice(0, 10);
  const storeName = purchase.store === "apple" ? "App Store" : "Google Play";

  /**
   * THE LEDGER KEY, and the reason one sale is one row.
   *
   * Keyed on the BILLING CYCLE — the subscription plus the window it bought —
   * not on the delivery. This function runs for the app's own verify call AND
   * for the store notification about the same purchase, and on iOS the
   * transaction id differs between them; the window does not. Next period's
   * renewal names a different window and is recorded as the separate sale it is.
   */
  const chargeKey = `${purchase.store}:sub:${purchase.subscriptionId}:${purchase.periodStart.toISOString()}`;

  const chargeNote =
    `${PLANS[purchase.plan].label} subscription · ${storeName} · ` +
    `${day(purchase.periodStart)} → ${day(purchase.periodEnd)}`;

  const metadata = {
    store: purchase.store,
    productId: purchase.productId,
    storeSubscriptionId: purchase.subscriptionId,
    storeTransactionId: purchase.transactionId,
    sandbox: purchase.sandbox,
  };

  const existing = await subscriptionByProviderId(purchase.subscriptionId);

  if (existing) {
    // A charge for a subscription the account has already moved on from.
    // Rolling its window forward would leave two rows granting at once, with
    // the older one's expiry overwriting the newer one's on the user.
    if (await supersededLocally(existing)) return { ok: false, reason: "superseded" };

    // Every renewal lands here, and so does a redelivery of the first purchase —
    // writing the same window twice is a no-op by design.
    await renewSubscription(existing.id, {
      periodStart: purchase.periodStart,
      periodEnd: purchase.periodEnd,
      amountCents: purchase.priceCents,
      actor: "webhook",
      note: `${storeName} renewal`,
      metadata,
    });

    await recordChargeIfPriced(purchase, chargeKey, chargeNote, userId, existing.id);

    return {
      ok: true,
      plan: toPlanKey(existing.plan) as Exclude<PlanKey, "free">,
      entitledUntil: purchase.periodEnd,
      renewed: true,
    };
  }

  const granted = await grantPlan({
    userId,
    plan: purchase.plan,
    startsAt: purchase.periodStart,
    periodEnd: purchase.periodEnd,
    priceCents: purchase.priceCents,
    // Only named when the store told us; otherwise `grantPlan` uses the plans
    // table's own currency rather than us inventing one.
    ...(purchase.currency ? { currency: purchase.currency } : {}),
    actor: "webhook",
    provider: purchase.store,
    providerSubscriptionId: purchase.subscriptionId,
    providerPlanId: purchase.productId,
    note: `${storeName} subscription activated`,
    metadata,
  });

  await recordChargeIfPriced(purchase, chargeKey, chargeNote, userId, granted.id);

  return {
    ok: true,
    plan: purchase.plan,
    entitledUntil: purchase.periodEnd,
    renewed: false,
  };
}

/**
 * Write the money row — but only when we actually know the amount.
 *
 * Google's `subscriptionsv2` does not report what was charged, so a Play sale
 * arrives with `priceCents: null`. Recording our own list price instead would
 * put a figure in the revenue ledger that nobody paid, in a currency that may
 * not be theirs. An absent row is a known gap; a wrong row is a wrong ledger.
 */
async function recordChargeIfPriced(
  purchase: VerifiedPurchase,
  idempotencyKey: string,
  note: string,
  userId: string,
  subscriptionId: string,
): Promise<void> {
  if (purchase.priceCents === null || purchase.currency === null) return;

  await recordCharge({
    idempotencyKey,
    amountCents: purchase.priceCents,
    currency: purchase.currency,
    provider: purchase.store,
    userId,
    subscriptionId,
    providerPaymentId: purchase.transactionId,
    note,
  });
}
