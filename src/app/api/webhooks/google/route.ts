import { NextResponse } from "next/server";
import {
  claimStoreEvent,
  reconcileStoreSubscription,
  releaseStoreEvent,
} from "@/lib/payments/iap/notifications";

/**
 * Google Play Real-time Developer Notifications.
 *
 * Play publishes to a Pub/Sub topic; Pub/Sub PUSHES to this URL. Set the topic
 * in Play Console → Monetisation setup → Real-time developer notifications, and
 * point a Pub/Sub push subscription at this route.
 *
 * The body is the Pub/Sub envelope: `{ message: { data: <base64 JSON> } }`. We
 * read the purchase token out of it and then ASK GOOGLE what that subscription
 * is currently worth — see src/lib/payments/iap/notifications.ts for why the
 * payload is a nudge rather than a fact.
 *
 * ALWAYS 200 ON A PAYLOAD WE UNDERSTOOD. Pub/Sub redelivers anything it did not
 * get a 2xx for, with backoff, and keeps doing so for the subscription's whole
 * retention window. The failures that can happen here — a purchase nobody has
 * linked, a product we no longer sell — recur identically on every retry, so a
 * non-2xx buys nothing but an ever-growing backlog.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type PubSubEnvelope = {
  message?: { data?: string; messageId?: string; publishTime?: string };
  subscription?: string;
};

type PlayNotification = {
  version?: string;
  packageName?: string;
  eventTimeMillis?: string;
  subscriptionNotification?: {
    version?: string;
    notificationType?: number;
    purchaseToken?: string;
    subscriptionId?: string;
  };
  testNotification?: { version?: string };
};

export async function POST(req: Request): Promise<NextResponse> {
  let envelope: PubSubEnvelope;
  try {
    envelope = (await req.json()) as PubSubEnvelope;
  } catch {
    return NextResponse.json({ error: "malformed" }, { status: 400 });
  }

  const raw = envelope.message?.data;
  if (!raw) return NextResponse.json({ error: "malformed" }, { status: 400 });

  let notification: PlayNotification;
  try {
    notification = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as PlayNotification;
  } catch {
    return NextResponse.json({ error: "malformed" }, { status: 400 });
  }

  // The console's "Send test notification" button. Acknowledge it, do nothing.
  if (notification.testNotification) {
    return NextResponse.json({ ok: true, test: true });
  }

  const purchaseToken = notification.subscriptionNotification?.purchaseToken;
  if (!purchaseToken) {
    // One-off product and voided-purchase notifications land here. We sell only
    // subscriptions, so they are understood and deliberately ignored.
    return NextResponse.json({ ok: true, ignored: "not_a_subscription" });
  }

  /**
   * Pub/Sub's `messageId` is stable across redeliveries of the same message,
   * which is exactly what the dedupe needs. Falling back to the token plus the
   * event time keeps two DIFFERENT events about one subscription distinct —
   * keying on the token alone would make a renewal look like a replay of the
   * purchase and silently drop it.
   */
  const eventId =
    envelope.message?.messageId ??
    `google:${purchaseToken}:${notification.eventTimeMillis ?? Date.now()}`;
  const eventType = `subscription.${notification.subscriptionNotification?.notificationType ?? "unknown"}`;

  const claimId = await claimStoreEvent("google", eventId, eventType, notification);
  if (!claimId) return NextResponse.json({ ok: true, duplicate: true });

  try {
    const result = await reconcileStoreSubscription("google", purchaseToken);

    // The one failure a redelivery actually fixes.
    if (!result.handled && result.reason === "store_unavailable") {
      await releaseStoreEvent(claimId);
      return NextResponse.json({ error: "store_unavailable" }, { status: 503 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await releaseStoreEvent(claimId);
    console.error("[play-webhook] failed:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
