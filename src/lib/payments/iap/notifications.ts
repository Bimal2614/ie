import "server-only";

import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { subscriptionByProviderId } from "@/lib/subscriptions";
import { activateFromStore } from "@/lib/payments/iap/activate";
import { verifyAppleTransaction } from "@/lib/payments/iap/apple";
import { verifyGooglePurchase } from "@/lib/payments/iap/google";
import { eq } from "drizzle-orm";

/**
 * What the store notifications share.
 *
 * THE NOTIFICATION IS A NUDGE, NOT A FACT. Neither handler grants anything from
 * the body it was posted. It reads ONE identifier out of the payload, then asks
 * the store directly — over TLS, with our own credentials — what that
 * subscription is currently worth, and acts on the answer.
 *
 * This is the same rule `activateFromRazorpay` already follows ("the
 * subscription is re-read from Razorpay rather than taken from either caller,
 * so both are asserting only 'look at this subscription again'"), and it is what
 * makes these endpoints safe to expose. A forged notification can, at worst,
 * make us re-check a real subscription and reach the conclusion we would have
 * reached anyway. It cannot invent a plan, a price or an expiry.
 *
 * Signature verification is still worth adding on top — Apple signs its payload
 * as JWS and Google Pub/Sub can carry an OIDC token — and is tracked as
 * hardening. It is defence in depth here rather than the thing entitlement
 * rests on, which is the ordering that matters.
 */

/**
 * Claim an event id before doing the work.
 *
 * Returns null when it is already in the table, which is the whole of the
 * replay protection: both stores retry anything they did not get a 2xx for, and
 * a blind replay would roll the paid window forward a second time — a free
 * period, granted by a dropped connection.
 *
 * Taken BEFORE the work so two concurrent deliveries cannot both pass; released
 * by the caller if the work fails, because a claim that outlives a failure
 * suppresses the retry that was meant to fix it.
 */
export async function claimStoreEvent(
  provider: "apple" | "google",
  eventId: string,
  eventType: string,
  payload: unknown,
): Promise<string | null> {
  const [row] = await db
    .insert(webhookEvents)
    .values({ provider, eventId, eventType, payload: payload as object })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  return row?.id ?? null;
}

/** Release a claim so the store's retry is not swallowed. */
export async function releaseStoreEvent(claimId: string): Promise<void> {
  await db.delete(webhookEvents).where(eq(webhookEvents.id, claimId));
}

export type ReconcileResult =
  | { handled: true; plan: string; entitledUntil: string }
  | { handled: false; reason: string };

/**
 * Re-read one store subscription and bring our record into line with it.
 *
 * The single path every notification type funnels into — renewed, expired,
 * refunded, upgraded, put on hold. There is no per-event-type branching because
 * there does not need to be any: whatever happened, the answer is "ask the
 * store what is true now and write that down". A notification type we have
 * never seen before is handled correctly by construction.
 *
 * THE ACCOUNT COMES FROM OUR TABLE, NOT FROM THE NOTIFICATION. Stores know
 * nothing about IELTSVega accounts, so the link was made when the candidate
 * first verified the purchase (see /api/v1/billing/iap/verify) and this looks it
 * up by the store's own subscription id. A notification for a subscription
 * nobody has ever verified has no account to act on, and is dropped.
 */
export async function reconcileStoreSubscription(
  store: "apple" | "google",
  handle: string,
): Promise<ReconcileResult> {
  const verified =
    store === "apple" ? await verifyAppleTransaction(handle) : await verifyGooglePurchase(handle);

  if (!verified.ok) {
    return { handled: false, reason: verified.reason };
  }

  const local = await subscriptionByProviderId(verified.purchase.subscriptionId);
  if (!local) {
    // Nothing to reconcile against. This is normal and not an error: it happens
    // when the store notifies us about a purchase before the app has had a
    // chance to verify it, and the app's own verify call will do the work.
    return { handled: false, reason: "unlinked_subscription" };
  }

  const result = await activateFromStore(local.userId, verified.purchase);
  if (!result.ok) return { handled: false, reason: result.reason };

  return {
    handled: true,
    plan: result.plan,
    entitledUntil: result.entitledUntil.toISOString(),
  };
}
