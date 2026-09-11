import { NextResponse } from "next/server";
import { decodeJwt } from "jose";
import {
  claimStoreEvent,
  reconcileStoreSubscription,
  releaseStoreEvent,
} from "@/lib/payments/iap/notifications";

/**
 * App Store Server Notifications V2.
 *
 * Set the URL in App Store Connect → your app → App Information → App Store
 * Server Notifications (there are separate production and sandbox slots).
 *
 * Apple POSTs `{ signedPayload }`, a JWS. We read the transaction id out of it
 * and then ASK APPLE what that subscription is currently worth — see
 * src/lib/payments/iap/notifications.ts for why the payload is a nudge rather
 * than a fact, and why that makes this endpoint safe to expose unauthenticated.
 *
 * ALWAYS 200 ON A PAYLOAD WE UNDERSTOOD. Apple retries a non-2xx for up to
 * three days, and the things that can go wrong here — a subscription nobody has
 * linked yet, a product we no longer sell — will go exactly as wrong on every
 * retry. A 5xx is reserved for the cases a retry could actually fix.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ApplePayload = {
  notificationType?: string;
  subtype?: string;
  notificationUUID?: string;
  data?: { signedTransactionInfo?: string };
};

export async function POST(req: Request): Promise<NextResponse> {
  let signedPayload: string;
  try {
    const body = (await req.json()) as { signedPayload?: string };
    if (!body.signedPayload) return NextResponse.json({ error: "malformed" }, { status: 400 });
    signedPayload = body.signedPayload;
  } catch {
    return NextResponse.json({ error: "malformed" }, { status: 400 });
  }

  let payload: ApplePayload;
  try {
    payload = decodeJwt(signedPayload) as ApplePayload;
  } catch {
    return NextResponse.json({ error: "malformed" }, { status: 400 });
  }

  const transactionId = transactionIdOf(payload);
  if (!transactionId) {
    // Notifications that carry no transaction — CONSUMPTION_REQUEST and the
    // test ping among them. Understood and deliberately ignored.
    return NextResponse.json({ ok: true, ignored: payload.notificationType ?? "unknown" });
  }

  /**
   * Apple's `notificationUUID` is stable across retries of the SAME delivery,
   * which is exactly what the dedupe needs. Without it a redelivered
   * DID_RENEW would roll the paid window forward twice.
   */
  const eventId = payload.notificationUUID ?? `apple:tx:${transactionId}`;
  const eventType = [payload.notificationType, payload.subtype].filter(Boolean).join(".");

  const claimId = await claimStoreEvent("apple", eventId, eventType || "unknown", payload);
  if (!claimId) return NextResponse.json({ ok: true, duplicate: true });

  try {
    const result = await reconcileStoreSubscription("apple", transactionId);

    // A store we could not reach is the one failure a retry fixes — release the
    // claim and ask Apple to come back.
    if (!result.handled && result.reason === "store_unavailable") {
      await releaseStoreEvent(claimId);
      return NextResponse.json({ error: "store_unavailable" }, { status: 503 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await releaseStoreEvent(claimId);
    console.error("[apple-webhook] failed:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

/** The transaction this notification is about, if it names one. */
function transactionIdOf(payload: ApplePayload): string | null {
  const signed = payload.data?.signedTransactionInfo;
  if (!signed) return null;
  try {
    const tx = decodeJwt(signed) as { originalTransactionId?: string; transactionId?: string };
    // The ORIGINAL id is the subscription's stable identity across renewals;
    // the per-charge id would send us looking up a different thing each time.
    return tx.originalTransactionId ?? tx.transactionId ?? null;
  } catch {
    return null;
  }
}
