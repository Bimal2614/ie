import { z } from "zod";
import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute, readJson } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { conflict, invalid, unavailable } from "@/lib/api/errors";
import { verifyAppleTransaction } from "@/lib/payments/iap/apple";
import { verifyGooglePurchase } from "@/lib/payments/iap/google";
import { activateFromStore } from "@/lib/payments/iap/activate";
import { subscriptionByProviderId } from "@/lib/subscriptions";
import { authenticatedUserById } from "@/lib/session";
import { toEntitlementsDto, toUserDto } from "@/lib/api/dto";
import { audit } from "@/lib/auth/core";
import { getRequestContext } from "@/lib/session";

/**
 * POST /api/v1/billing/iap/verify — turn a store purchase into a subscription.
 *
 * The app completes the purchase with the platform SDK and sends the receipt
 * here. NOTHING about the purchase is taken from the app: it supplies an opaque
 * handle (an Apple transaction id or a Play purchase token) and the server asks
 * the store what that handle is actually worth — which tier, which window, is
 * it still live. A client that could name its own tier could buy the cheapest
 * product and claim Premium.
 *
 * THE APP MUST CALL THIS AFTER EVERY PURCHASE **AND** ON "RESTORE PURCHASES",
 * and must not finish/acknowledge the transaction with the store until it
 * returns ok. An unacknowledged Play purchase is auto-refunded after three
 * days, so acknowledging before our side has recorded anything is how a
 * candidate ends up charged with no plan — or refunded with one.
 *
 * IDEMPOTENT. Verifying the same purchase twice returns the same entitlement
 * and writes nothing the second time, which is what makes "restore purchases"
 * and a retry after a dropped connection both safe.
 */
export const dynamic = "force-dynamic";

/** The store round trip plus our writes; well inside any platform ceiling. */
export const maxDuration = 30;

const verifySchema = z.discriminatedUnion("store", [
  z.object({
    store: z.literal("apple"),
    /** StoreKit's `transactionId` for the purchase (NOT the app receipt blob). */
    transactionId: z.string().trim().min(1).max(256),
  }),
  z.object({
    store: z.literal("google"),
    /** The `purchaseToken` from the Play billing client. */
    purchaseToken: z.string().trim().min(1).max(2048),
  }),
]);

export const POST = apiRoute(async (req) => {
  const user = await requireApiCandidate(req);
  const body = await readJson(req, verifySchema);
  const origin = await getRequestContext();

  const verified =
    body.store === "apple"
      ? await verifyAppleTransaction(body.transactionId)
      : await verifyGooglePurchase(body.purchaseToken);

  if (!verified.ok) {
    await audit(user.id, "iap.verify.failed", origin, {
      store: body.store,
      reason: verified.reason,
    });

    switch (verified.reason) {
      case "not_configured":
      case "store_unavailable":
        // Ours to fix, or the store's — either way the app should retry rather
        // than tell the candidate their payment failed. It did not.
        throw unavailable(verified.message, 10);
      case "not_active":
        throw conflict(verified.message);
      default:
        throw invalid(verified.message);
    }
  }

  const purchase = verified.purchase;

  /**
   * ONE STORE SUBSCRIPTION BELONGS TO ONE ACCOUNT, FOREVER.
   *
   * Without this check, a candidate could buy once and then verify the same
   * receipt against a second, third and fourth account — one payment, unlimited
   * Premium. The store has no notion of our accounts, so this is the only place
   * that link can be enforced. The first account to verify it owns it.
   */
  const existing = await subscriptionByProviderId(purchase.subscriptionId);
  if (existing && existing.userId !== user.id) {
    await audit(user.id, "iap.verify.rejected.other_account", origin, {
      store: purchase.store,
      subscriptionId: purchase.subscriptionId,
    });
    throw conflict(
      "That purchase is already linked to a different IELTSVega account. " +
        "Sign in with that account, or contact support.",
    );
  }

  const activated = await activateFromStore(user.id, purchase);

  if (!activated.ok) {
    await audit(user.id, "iap.activate.failed", origin, {
      store: purchase.store,
      reason: activated.reason,
    });

    if (activated.reason === "superseded") {
      // They are already on something newer. Not an error the candidate caused,
      // and their entitlement is intact — say so rather than alarming them.
      throw conflict("Your account is already on a newer subscription.");
    }
    if (activated.reason === "sandbox_in_production") {
      throw invalid("That purchase could not be verified.");
    }
    throw conflict("That purchase is no longer active.");
  }

  await audit(user.id, "iap.activate.success", origin, {
    store: purchase.store,
    plan: activated.plan,
    renewed: activated.renewed,
  });

  // Re-read so the response carries the entitlement the NEXT request will see,
  // rather than the stale copy this request authenticated with.
  const refreshed = await authenticatedUserById(user.id);

  return ok({
    plan: activated.plan,
    entitledUntil: activated.entitledUntil.toISOString(),
    renewed: activated.renewed,
    user: refreshed ? toUserDto(refreshed) : toUserDto(user),
    entitlements: toEntitlementsDto(refreshed?.plan ?? activated.plan),
  });
});
