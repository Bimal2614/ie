import "server-only";

import { SignJWT, importPKCS8 } from "jose";
import { env, isGoogleIapConfigured, planForStoreProduct } from "@/lib/env";
import type { VerifiedPurchase, VerifyResult } from "@/lib/payments/iap/types";

/**
 * Google Play purchase verification, via the Play Developer API.
 *
 * The app sends the `purchaseToken` from `in_app_purchase`; we ask Google what
 * that token is currently worth. As with Apple, nothing about the tier, the
 * price or the expiry is taken from the client.
 *
 * AUTH IS A SERVICE ACCOUNT. We sign an RS256 assertion with the service
 * account's key, trade it for an OAuth access token, and use that. The service
 * account needs "View financial data" in the Play Console, granted to the app —
 * a service account with project access but no PLAY access gets a 401 here that
 * looks exactly like bad credentials.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PLAY_API = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";

const TOKEN_TTL_SECONDS = 3600;
const TOKEN_REFRESH_MARGIN_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS > now) {
    return cachedToken.token;
  }

  // Literal \n in the env var, restored to real newlines — see the same note in
  // apple.ts. A key that fails to import here surfaces as "invalid credentials"
  // several layers away, so it is worth getting right at the source.
  const pem = env.GOOGLE_PLAY_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const key = await importPKCS8(pem, "RS256");

  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL!)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(key);

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!body.access_token) return null;

    cachedToken = {
      token: body.access_token,
      expiresAt: now + (body.expires_in ?? TOKEN_TTL_SECONDS) * 1000,
    };
    return cachedToken.token;
  } catch {
    return null;
  }
}

/** The slice of `purchases.subscriptionsv2` we actually read. */
type SubscriptionV2 = {
  subscriptionState?: string;
  latestOrderId?: string;
  linkedPurchaseToken?: string;
  startTime?: string;
  canceledStateContext?: unknown;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
  }>;
};

export async function verifyGooglePurchase(purchaseToken: string): Promise<VerifyResult> {
  if (!isGoogleIapConfigured()) {
    return { ok: false, reason: "not_configured", message: "Play purchases aren't set up." };
  }

  const token = await accessToken();
  if (!token) {
    return {
      ok: false,
      reason: "store_unavailable",
      message: "We couldn't reach Google Play. Please try again.",
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `${PLAY_API}/applications/${encodeURIComponent(env.GOOGLE_PLAY_PACKAGE_NAME!)}` +
        `/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
  } catch {
    return {
      ok: false,
      reason: "store_unavailable",
      message: "We couldn't reach Google Play. Please try again.",
    };
  }

  // Google answers 410 for a token it has purged and 404 for one it never had;
  // both mean the same thing to us.
  if (response.status === 404 || response.status === 410 || response.status === 400) {
    return { ok: false, reason: "invalid", message: "That purchase could not be verified." };
  }
  if (!response.ok) {
    return {
      ok: false,
      reason: "store_unavailable",
      message: "Google Play didn't respond properly. Please try again.",
    };
  }

  const sub = (await response.json()) as SubscriptionV2;
  const line = sub.lineItems?.[0];
  if (!line?.productId || !line.expiryTime) {
    return { ok: false, reason: "invalid", message: "That purchase could not be verified." };
  }

  const plan = planForStoreProduct("google", line.productId);
  if (!plan) {
    return { ok: false, reason: "unknown_product", message: "That product isn't one we sell." };
  }

  /**
   * Play's subscription states. ACTIVE and IN_GRACE_PERIOD are entitlements;
   * ON_HOLD and PAUSED are not (the candidate has lost access at Google's end,
   * so leaving ours open would contradict what the store tells them); CANCELED
   * still runs to its expiry, which `expiryTime` already expresses.
   */
  const state = sub.subscriptionState ?? "";
  const active =
    state === "SUBSCRIPTION_STATE_ACTIVE" ||
    state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" ||
    state === "SUBSCRIPTION_STATE_CANCELED";

  /**
   * THE SUBSCRIPTION'S STABLE IDENTITY.
   *
   * A Play upgrade, downgrade or resignup issues a NEW purchase token and
   * points `linkedPurchaseToken` at the old one. Following that link keeps the
   * whole history on one row; using the new token alone would leave the old
   * subscription active in our table forever, because nothing would ever
   * mention it again.
   */
  const subscriptionId = sub.linkedPurchaseToken ?? purchaseToken;

  const purchase: VerifiedPurchase = {
    store: "google",
    subscriptionId,
    transactionId: sub.latestOrderId ?? null,
    productId: line.productId,
    plan,
    periodStart: sub.startTime ? new Date(sub.startTime) : new Date(),
    periodEnd: new Date(line.expiryTime),
    active,
    cancelAtPeriodEnd:
      state === "SUBSCRIPTION_STATE_CANCELED" ||
      line.autoRenewingPlan?.autoRenewEnabled === false,
    /**
     * Deliberately null.
     *
     * `subscriptionsv2` does not report what was charged — the price lives on
     * the order, in a different API, and varies by storefront. Recording our own
     * list price instead would put a number in the revenue ledger that nobody
     * ever paid. Null is honest; the Play Console remains the source for
     * revenue reporting until the orders API is wired up.
     */
    priceCents: null,
    currency: null,
    // Play licence-tester purchases are real purchases against a test account;
    // there is no separate sandbox host to guard against as there is on iOS.
    sandbox: false,
  };

  return { ok: true, purchase };
}
