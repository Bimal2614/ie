"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/dal";
import { isRazorpayConfigured } from "@/lib/env";
import { isOfferedPlan, PLANS } from "@/lib/plans";
import { checkoutCurrency } from "@/lib/payments/region";
import { guardGeneral, RateLimitError, SLOW_DOWN } from "@/lib/security/rate-guard";
import {
  activateFromRazorpay,
  cancelMandate,
  openCheckout,
  PlanConfigError,
  type CheckoutSession,
} from "@/lib/payments/billing";
import { RazorpayApiError, verifyCheckoutSignature } from "@/lib/payments/razorpay";
import { currentSubscription, requestCancellation } from "@/lib/subscriptions";

/**
 * The three things a candidate can do about their own subscription: start one,
 * confirm the payment that started it, and stop it.
 *
 * A SERVER ACTION IS A PUBLIC ENDPOINT. Every one of these re-derives the
 * account from the session and re-validates its arguments, because the buttons
 * that call them are UX and not a gate — the tier comes from `requireUser()`,
 * never from the caller, and the amount comes from Razorpay's own record of the
 * subscription, never from the browser that just claimed to have paid it.
 *
 * WHAT A CANDIDATE IS TOLD ON FAILURE is deliberately vague. Razorpay's error
 * descriptions are useful to us and meaningless-but-alarming to them ("The api
 * key provided is invalid"), so they are logged in full and reported as one
 * sentence that suggests the only useful next step.
 */

const CHECKOUT_UNAVAILABLE =
  "Card payments aren't available right now. Please try again in a few minutes, or contact us and we'll set this up for you.";

export type CheckoutResult =
  | { ok: true; session: CheckoutSession }
  | { ok: false; error: string };

/** Narrows what the browser hands back from Razorpay Checkout. */
const callbackSchema = z.object({
  razorpay_subscription_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

/**
 * Open a Razorpay subscription for the signed-in account and hand the browser
 * what it needs to show the modal.
 *
 * SIGNING IN IS REQUIRED, which is a change from the UPI dialog this replaces:
 * a QR code could be shown to a visitor because a human matched the transfer to
 * an email afterwards, but a mandate has to be attached to an account at the
 * moment it is created or there is nothing to grant when it charges. The
 * pricing card sends a visitor to sign up first.
 *
 * THE CURRENCY IS NAMED BY THE BROWSER, and that is on purpose: the pricing
 * page shows a ₹/$ switch, and a choice the server quietly overrules is not a
 * choice. What the browser cannot do is name a PRICE — `checkoutCurrency`
 * narrows the request to a currency we actually have Razorpay plans for, the
 * amount is read from src/lib/plans.ts, and `resolvePlanTerms` then checks it
 * against Razorpay's own copy of the plan before a card is touched. So the
 * worst a tampered argument achieves is being quoted the other real price.
 */
export async function startCheckout(plan: string, currency?: string): Promise<CheckoutResult> {
  const user = await requireUser();

  try {
    // Each call creates a customer and a subscription at Razorpay, so it is a
    // write to somebody else's system as much as ours.
    await guardGeneral(user.id);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: SLOW_DOWN };
    throw error;
  }

  // The tier is re-checked against what is actually on sale: the argument comes
  // from a button, and a button is a suggestion.
  if (!isOfferedPlan(plan)) {
    return { ok: false, error: "That plan isn't available." };
  }
  if (!isRazorpayConfigured()) {
    console.error("[billing] startCheckout called with Razorpay unconfigured");
    return { ok: false, error: CHECKOUT_UNAVAILABLE };
  }

  try {
    const session = await openCheckout(
      { id: user.id, name: user.name, email: user.email, phone: user.phone },
      plan,
      await checkoutCurrency(currency),
    );
    return { ok: true, session };
  } catch (error) {
    /*
     * The plan is missing or disagrees with the pricing page.
     *
     * REFUSING IS THE POINT. This is the branch that stops us charging an
     * amount the candidate was never shown, so it must not degrade into
     * "charge whatever the dashboard says" — it fails the sale and shouts, in
     * full, with the exact mismatch, because only a human editing the dashboard
     * or src/lib/plans.ts can resolve it.
     */
    if (error instanceof PlanConfigError) {
      console.error(`[billing] plan misconfigured: ${error.message}`);
      return { ok: false, error: CHECKOUT_UNAVAILABLE };
    }
    // The most likely gateway failure is a currency the account is not approved
    // for, or Subscriptions not being enabled on it; the description says which,
    // so it is logged whole.
    if (error instanceof RazorpayApiError) {
      console.error(`[billing] Razorpay refused to open a checkout: ${error.message}`);
      return { ok: false, error: CHECKOUT_UNAVAILABLE };
    }
    throw error;
  }
}

export type ConfirmResult =
  | { ok: true; plan: string; entitledUntil: string }
  | { ok: false; error: string };

/**
 * Verify the signed callback Checkout handed the page, and put the account on
 * the plan.
 *
 * THE SIGNATURE IS THE WHOLE GATE. Without it this is an endpoint where any
 * signed-in user can name a subscription id and be granted a plan. With it, the
 * caller must hold an HMAC over `payment_id|subscription_id` that only Razorpay
 * and our key secret can produce.
 *
 * THIS IS NOT THE ONLY WAY AN ACCOUNT IS ACTIVATED, and it is not the reliable
 * one — the candidate may close the tab before it runs. The `subscription.charged`
 * webhook activates the same subscription independently; whichever arrives
 * first wins and the other is a no-op. This path exists so the page can say
 * "you're on Premium" without waiting for a webhook round trip.
 */
export async function confirmCheckout(payload: unknown): Promise<ConfirmResult> {
  const user = await requireUser();

  const parsed = callbackSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "That payment couldn't be read." };

  const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  if (
    !verifyCheckoutSignature({
      paymentId: razorpay_payment_id,
      subscriptionId: razorpay_subscription_id,
      signature: razorpay_signature,
    })
  ) {
    // Either a forgery or a genuine payment against a different key pair. Both
    // are worth seeing; neither grants anything.
    console.error(
      `[billing] rejected an unsigned checkout callback for ${razorpay_subscription_id} (user ${user.id})`,
    );
    return { ok: false, error: "We couldn't verify that payment. Please contact us before paying again." };
  }

  try {
    const result = await activateFromRazorpay({
      subscriptionId: razorpay_subscription_id,
      paymentId: razorpay_payment_id,
      actor: "user",
    });

    if (!result.ok) {
      // `not_paid` here usually means Razorpay has not finished settling the
      // first charge. The webhook will activate it moments later, so the
      // candidate is told to wait rather than to pay again.
      console.warn(`[billing] activation deferred for ${razorpay_subscription_id}: ${result.reason}`);
      return {
        ok: false,
        error: "Your payment went through and we're still confirming it. Refresh in a minute.",
      };
    }

    revalidatePath("/", "layout");
    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return {
      ok: true,
      plan: PLANS[result.plan].label,
      entitledUntil: result.entitledUntil.toISOString(),
    };
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      console.error(`[billing] could not read back ${razorpay_subscription_id}: ${error.message}`);
      return {
        ok: false,
        error: "Your payment went through and we're still confirming it. Refresh in a minute.",
      };
    }
    throw error;
  }
}

export type CancelResult = { ok: boolean; message: string };

/**
 * Stop the recurring charge, keeping what has already been paid for.
 *
 * ORDER MATTERS: the mandate is cancelled at Razorpay first, and only a success
 * there is recorded locally. The reverse order produces the worst possible
 * state — an account that shows "cancelled" while the card is still debited
 * every cycle — and it is the order the obvious implementation reaches for.
 *
 * Nothing is taken away: `requestCancellation` marks the subscription
 * `cancelling` and leaves entitlement running to `current_period_end`, which is
 * what "Cancel anytime" on the pricing page promises and what the nightly sweep
 * finally acts on.
 */
export async function cancelSubscriptionAction(): Promise<CancelResult> {
  const user = await requireUser();

  const sub = await currentSubscription(user.id);
  if (!sub) return { ok: false, message: "You don't have an active subscription." };
  if (sub.cancelAtPeriodEnd) {
    return { ok: true, message: "Your subscription is already set to end at the close of this period." };
  }

  if (sub.provider === "razorpay") {
    if (!sub.providerSubscriptionId) {
      // A Razorpay row with no handle cannot be stopped from here at all, and
      // pretending otherwise would leave the mandate running.
      console.error(`[billing] subscription ${sub.id} is razorpay but has no provider id`);
      return { ok: false, message: "We couldn't cancel that automatically. Please contact us and we'll sort it out." };
    }
    try {
      await cancelMandate(sub.providerSubscriptionId, true);
    } catch (error) {
      console.error(`[billing] Razorpay refused to cancel ${sub.providerSubscriptionId}:`, error);
      return { ok: false, message: "We couldn't reach the payment provider. Please try again shortly." };
    }
  }

  const { cancelled, entitledUntil } = await requestCancellation(user.id, {
    reason: "Cancelled by the customer",
    actor: "user",
    actorUserId: user.id,
  });

  revalidatePath("/settings");

  if (!cancelled) return { ok: false, message: "You don't have an active subscription." };

  const until = entitledUntil
    ? entitledUntil.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return {
    ok: true,
    message: until
      ? `Cancelled. You keep full access until ${until}, and you won't be charged again.`
      : "Cancelled. You won't be charged again.",
  };
}
