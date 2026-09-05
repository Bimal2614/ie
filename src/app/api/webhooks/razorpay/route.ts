import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { isRazorpayWebhookConfigured } from "@/lib/env";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import {
  activateFromRazorpay,
  recordFailedPayment,
  supersededLocally,
  userIdByCustomerId,
} from "@/lib/payments/billing";
import { markPastDue, requestCancellation, subscriptionByProviderId } from "@/lib/subscriptions";

/**
 * Razorpay's webhook — where a RECURRING subscription actually recurs.
 *
 * THIS IS THE ONLY THING THAT RENEWS AN ACCOUNT. The checkout callback in
 * src/app/actions/billing.ts activates the first period while the candidate is
 * still looking at the page, but every cycle after that happens months later
 * with nobody's browser open: Razorpay debits the mandate on its own schedule
 * and posts `subscription.charged` here. Without this route the integration
 * sells a three-month plan and silently stops after one term.
 *
 * SET IT UP: Razorpay Dashboard → Settings → Webhooks → Add New Webhook.
 *   URL     <APP_URL>/api/webhooks/razorpay
 *   Secret  a value you choose; put the same one in RAZORPAY_WEBHOOK_SECRET
 *   Events  subscription.charged, subscription.activated, subscription.pending,
 *           subscription.halted, subscription.cancelled, subscription.completed,
 *           payment.failed
 *
 * The route is CLOSED until that secret is set, exactly as the cron sweep is:
 * an unverified payment webhook is an endpoint for granting anyone a paid plan.
 */

// Never prerendered, never cached: it mutates, and it must read a raw body.
export const dynamic = "force-dynamic";

/** Razorpay's event envelope, narrowed to the fields this route reads. */
type RazorpayEvent = {
  event?: string;
  payload?: {
    subscription?: { entity?: { id?: string; notes?: Record<string, string> } };
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
        /** "INR" or "USD" — which of the two plans behind this tier was sold. */
        currency?: string;
        error_description?: string;
        notes?: Record<string, string>;
        /**
         * The payer's `cust_…`. THE ONLY OWNER HANDLE ON A FAILED SUBSCRIPTION
         * PAYMENT — see the `payment.failed` branch below for why the notes
         * cannot be relied on here.
         */
        customer_id?: string;
      };
    };
  };
};

/**
 * Claim this delivery, or discover it was already handled.
 *
 * Returns false when the event id is already in the table, which is the whole
 * of the replay protection: Razorpay retries anything it did not get a 2xx for,
 * and a blind replay of `subscription.charged` would roll the paid window
 * forward a second time — a free quarter, granted by a dropped connection.
 *
 * The claim is taken BEFORE the work, so two concurrent deliveries cannot both
 * pass. If the work then fails the claim is released (see the caller), because
 * a claim that outlives a failure would suppress the retry that was meant to
 * fix it.
 */
async function claim(eventId: string, eventType: string, payload: unknown): Promise<string | null> {
  const [row] = await db
    .insert(webhookEvents)
    .values({ provider: "razorpay", eventId, eventType, payload: payload as object })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  return row?.id ?? null;
}

/** The account behind an event, if it carries enough to identify one. */
async function localSubscriptionFor(providerSubscriptionId: string | undefined) {
  if (!providerSubscriptionId) return null;
  return subscriptionByProviderId(providerSubscriptionId);
}

/**
 * The row an event is about, but only while it is still the one that counts.
 *
 * Razorpay goes on talking about a subscription after the account has replaced
 * it — a customer who cancels and resubscribes leaves a `subscription.cancelled`
 * in flight for the old mandate while the new one is already live. The
 * transitions below act on the USER, not on a row id, so without this an old
 * subscription's ending would cancel the subscription that replaced it.
 */
async function liveSubscriptionFor(providerSubscriptionId: string | undefined) {
  const local = await localSubscriptionFor(providerSubscriptionId);
  if (!local) return null;
  if (await supersededLocally(local)) {
    console.warn(`[razorpay-webhook] ignoring an event for superseded ${providerSubscriptionId}`);
    return null;
  }
  return local;
}

export async function POST(request: Request) {
  if (!isRazorpayWebhookConfigured()) {
    // 404, not 401: an unauthenticated caller learns nothing about whether this
    // route exists or whether a secret is configured. Same reasoning as the
    // cron sweep in /api/cron/subscriptions.
    return new NextResponse(null, { status: 404 });
  }

  // The RAW bytes, before any parsing: the signature covers exactly what was
  // sent, and re-serialising parsed JSON reorders keys and never matches.
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    console.error("[razorpay-webhook] rejected a delivery with a bad signature");
    return new NextResponse(null, { status: 404 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw) as RazorpayEvent;
  } catch {
    // Signed but unparseable should never happen; retrying it will not help.
    return NextResponse.json({ ok: false, error: "unparseable" }, { status: 400 });
  }

  const type = event.event ?? "unknown";
  // Razorpay's own id for this delivery. Falling back to the payment id keeps
  // dedupe working if the header is ever absent; a random id would defeat it.
  const eventId =
    request.headers.get("x-razorpay-event-id") ??
    `${type}:${event.payload?.payment?.entity?.id ?? event.payload?.subscription?.entity?.id ?? raw.length}`;

  const claimId = await claim(eventId, type, event);
  if (!claimId) {
    // Already handled. 200, so Razorpay stops retrying it.
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await handle(type, event);
    return NextResponse.json({ ok: true, event: type });
  } catch (error) {
    // Release the claim so Razorpay's retry can have another go at it.
    await db.delete(webhookEvents).where(eq(webhookEvents.id, claimId));
    console.error(`[razorpay-webhook] ${type} failed:`, error);
    // 500 asks Razorpay to redeliver. Anything 2xx here would drop the event.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/**
 * What each event means for an account.
 *
 * Everything that changes entitlement goes through src/lib/subscriptions.ts, so
 * a webhook moves `subscriptions`, `users.plan` and the ledger together or not
 * at all — this file decides WHICH transition, never how to write it.
 */
async function handle(type: string, event: RazorpayEvent): Promise<void> {
  const subEntity = event.payload?.subscription?.entity;
  const paymentEntity = event.payload?.payment?.entity;
  const subscriptionId = subEntity?.id;

  switch (type) {
    /*
     * The money event, and the only one that grants time.
     *
     * Fires for the FIRST charge as well as every renewal, which is why
     * `activateFromRazorpay` is written to be idempotent: on the first it may
     * find the row the checkout callback just created and simply re-apply the
     * same window, and on a renewal it rolls that window forward to whatever
     * Razorpay says the new cycle is.
     */
    case "subscription.charged":
    case "subscription.activated": {
      if (!subscriptionId) return;
      const result = await activateFromRazorpay({
        subscriptionId,
        paymentId: paymentEntity?.id ?? null,
        // What was really debited, which after a price change is not what
        // src/lib/plans.ts says today.
        amountCents: typeof paymentEntity?.amount === "number" ? paymentEntity.amount : null,
        actor: "webhook",
      });
      if (!result.ok) {
        console.warn(`[razorpay-webhook] ${type} for ${subscriptionId} did nothing: ${result.reason}`);
      }
      return;
    }

    /*
     * A renewal charge failed and Razorpay is retrying it.
     *
     * Entitlement is HELD for a grace window rather than withdrawn: a card that
     * expires on the 1st should not lock a candidate out of a mock test they
     * started, and Razorpay is still trying. If the retries succeed,
     * `subscription.charged` arrives and rolls the window properly forward; if
     * they do not, the grace runs out and the nightly sweep expires it like any
     * other lapsed subscription.
     */
    case "subscription.pending": {
      const local = await liveSubscriptionFor(subscriptionId);
      if (!local) return;
      await markPastDue(local.id, {
        note: `Razorpay retrying a failed charge on ${subscriptionId}`,
      });
      return;
    }

    /*
     * Retries exhausted, or the customer stopped it, or the mandate ran its
     * full course.
     *
     * All three are recorded the same way — as a cancellation that HONOURS the
     * paid period. Nothing is taken back here: the candidate keeps what they
     * have already paid for and the sweep withdraws it at `current_period_end`.
     * Taking access away the moment a card fails would claw back a period that
     * was paid for in full, which is a refund we did not give.
     */
    case "subscription.halted":
    case "subscription.cancelled":
    case "subscription.completed": {
      const local = await liveSubscriptionFor(subscriptionId);
      if (!local) return;
      await requestCancellation(local.userId, {
        reason:
          type === "subscription.halted"
            ? "Razorpay halted the subscription after failed retries"
            : type === "subscription.completed"
              ? "Razorpay subscription reached its final cycle"
              : "Cancelled at Razorpay",
        actor: "webhook",
      });
      return;
    }

    /*
     * A single payment failed. No entitlement changes — `subscription.pending`
     * is what says the SUBSCRIPTION is in trouble. This is only recorded, so
     * support can see the attempt when a candidate says their card was
     * declined.
     *
     * FINDING THE OWNER IS THE WHOLE DIFFICULTY, and it is why this branch is
     * longer than what it writes. `payment.failed` is the one subscription event
     * that arrives with NO subscription entity: there are no `notes` to read the
     * account out of (the payment's own `notes` come through as an empty array),
     * and no `sub_…` to look a local row up by. Trusting those alone dropped
     * every failed first payment on the floor — the candidate whose UPI mandate
     * timed out got no ledger row at all, so support had nothing to show them.
     *
     * `customer_id` is what the event does carry, and `ensureCustomerId` wrote
     * that onto the user when the checkout was opened, so it closes the gap for
     * exactly the case the notes cannot cover.
     */
    case "payment.failed": {
      const local = await localSubscriptionFor(subscriptionId);
      const owner =
        paymentEntity?.notes?.userId ??
        subEntity?.notes?.userId ??
        local?.userId ??
        (await userIdByCustomerId(paymentEntity?.customer_id));
      if (!owner) {
        /*
         * A payment we cannot attribute to anybody — a checkout opened before
         * this account had a customer id cached, or a payment made outside the
         * app entirely. Nothing to record it against, but it is NOT nothing:
         * silence here is what hid the dropped failures in the first place, so
         * it goes to the log with the handles a human can search Razorpay by.
         */
        console.warn(
          `[razorpay-webhook] payment.failed with no owner: payment ${paymentEntity?.id ?? "?"}, ` +
            `customer ${paymentEntity?.customer_id ?? "none"}, subscription ${subscriptionId ?? "none"}`,
        );
        return;
      }
      await recordFailedPayment({
        userId: owner,
        subscriptionId: local?.id ?? null,
        amountCents: typeof paymentEntity?.amount === "number" ? paymentEntity.amount : null,
        // An amount in cents filed under rupees is a support ticket nobody can
        // read; the gateway says which it tried to take, so take its word.
        currency: paymentEntity?.currency ?? subEntity?.notes?.currency ?? null,
        note: paymentEntity?.error_description ?? "Payment failed at Razorpay",
        metadata: {
          razorpayPaymentId: paymentEntity?.id ?? null,
          razorpaySubscriptionId: subscriptionId ?? null,
          razorpayCustomerId: paymentEntity?.customer_id ?? null,
        },
      });
      return;
    }

    default:
      // Subscribed to more events than we act on is fine and is the safe
      // direction: the delivery is recorded, acknowledged, and ignored.
      return;
  }
}
