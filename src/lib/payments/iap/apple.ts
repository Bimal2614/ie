import "server-only";

import { SignJWT, importPKCS8, decodeJwt, decodeProtectedHeader } from "jose";
import { env, isAppleIapConfigured, planForStoreProduct } from "@/lib/env";
import type { VerifiedPurchase, VerifyResult } from "@/lib/payments/iap/types";

/**
 * App Store purchase verification, via the App Store Server API.
 *
 * NOT the old `verifyReceipt` endpoint, which Apple has deprecated. The app
 * sends the `transactionId` from `in_app_purchase`, and we ask Apple for the
 * subscription's current state. Everything that decides entitlement is read
 * from Apple's answer.
 *
 * AUTH IS A JWT WE SIGN. Apple does not issue us a bearer token; we mint an
 * ES256 JWT from the .p8 key downloaded in App Store Connect and send it as the
 * bearer. It is short-lived and cached below, because signing one per request is
 * pure CPU for no benefit.
 */

const PRODUCTION_HOST = "https://api.storekit.itunes.apple.com";
const SANDBOX_HOST = "https://api.storekit-sandbox.itunes.apple.com";

/** Apple caps these at 60 minutes; a short life limits the damage of a leak. */
const TOKEN_TTL_SECONDS = 20 * 60;
/** Re-sign a little early so a request never carries one that expires in flight. */
const TOKEN_REFRESH_MARGIN_MS = 60 * 1000;

const REQUEST_TIMEOUT_MS = 15_000;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function appStoreToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS > now) {
    return cachedToken.token;
  }

  // The .p8 arrives from an env var, where a real newline cannot survive — so
  // it is stored with literal \n and restored here. Without this, importPKCS8
  // fails with an unhelpful "Invalid keyData".
  const pem = env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const key = await importPKCS8(pem, "ES256");

  const token = await new SignJWT({ bid: env.APPLE_BUNDLE_ID! })
    .setProtectedHeader({ alg: "ES256", kid: env.APPLE_KEY_ID!, typ: "JWT" })
    .setIssuer(env.APPLE_ISSUER_ID!)
    // Apple requires exactly this audience string.
    .setAudience("appstoreconnect-v1")
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(key);

  cachedToken = { token, expiresAt: now + TOKEN_TTL_SECONDS * 1000 };
  return token;
}

/**
 * The fields we read out of a signed transaction / renewal payload.
 *
 * Apple sends these as JWS. We decode rather than verify the signature: the
 * payload came to us over TLS from Apple's own API in response to an
 * authenticated request, so the transport is the proof. A JWS arriving by any
 * OTHER route — a webhook, or anything a client handed us — MUST have its
 * signature checked against Apple's certificate chain instead, which is why
 * this function is not exported.
 */
type AppleTransaction = {
  originalTransactionId?: string;
  transactionId?: string;
  productId?: string;
  purchaseDate?: number;
  expiresDate?: number;
  environment?: string;
  revocationDate?: number;
  price?: number;
  currency?: string;
};

type AppleRenewalInfo = {
  autoRenewStatus?: number;
  expirationIntent?: number;
};

function decodeTransaction(jws: string): AppleTransaction | null {
  try {
    // Reject anything that is not a JWS before decoding it as one.
    decodeProtectedHeader(jws);
    return decodeJwt(jws) as AppleTransaction;
  } catch {
    return null;
  }
}

/**
 * Look up one transaction's subscription status with Apple.
 *
 * `transactionId` is whatever the app was given by StoreKit; Apple resolves it
 * to the subscription group it belongs to and reports every status in it.
 */
export async function verifyAppleTransaction(transactionId: string): Promise<VerifyResult> {
  if (!isAppleIapConfigured()) {
    return { ok: false, reason: "not_configured", message: "App Store purchases aren't set up." };
  }

  const sandbox = env.APPLE_ENVIRONMENT === "Sandbox";
  const host = sandbox ? SANDBOX_HOST : PRODUCTION_HOST;

  let response: Response;
  try {
    response = await fetch(
      `${host}/inApps/v1/subscriptions/${encodeURIComponent(transactionId)}`,
      {
        headers: { Authorization: `Bearer ${await appStoreToken()}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
  } catch {
    return {
      ok: false,
      reason: "store_unavailable",
      message: "We couldn't reach the App Store. Please try again.",
    };
  }

  // 404 means Apple has never heard of this transaction — a fabricated or
  // wrong-environment id. Anything else in the 4xx range is our request being
  // malformed, which is still not something the candidate can fix.
  if (response.status === 404 || response.status === 400) {
    return { ok: false, reason: "invalid", message: "That purchase could not be verified." };
  }
  if (!response.ok) {
    return {
      ok: false,
      reason: "store_unavailable",
      message: "The App Store didn't respond properly. Please try again.",
    };
  }

  const body = (await response.json()) as {
    data?: Array<{
      lastTransactions?: Array<{
        status?: number;
        signedTransactionInfo?: string;
        signedRenewalInfo?: string;
      }>;
    }>;
  };

  const entry = body.data?.[0]?.lastTransactions?.[0];
  if (!entry?.signedTransactionInfo) {
    return { ok: false, reason: "invalid", message: "That purchase could not be verified." };
  }

  const tx = decodeTransaction(entry.signedTransactionInfo);
  if (!tx?.productId || !tx.originalTransactionId || !tx.expiresDate) {
    return { ok: false, reason: "invalid", message: "That purchase could not be verified." };
  }

  const plan = planForStoreProduct("apple", tx.productId);
  if (!plan) {
    return {
      ok: false,
      reason: "unknown_product",
      message: "That product isn't one we sell.",
    };
  }

  /**
   * A SANDBOX PURCHASE MUST NEVER GRANT A REAL PLAN IN PRODUCTION.
   *
   * Sandbox receipts are free and anyone with a developer account can mint
   * them, so treating one as a sale would hand out Premium for nothing. The
   * environment is taken from Apple's own payload, not from our configuration,
   * because it is the payload that says what this purchase actually was.
   */
  const isSandbox = (tx.environment ?? (sandbox ? "Sandbox" : "Production")) === "Sandbox";

  /**
   * Apple's status codes: 1 = active, 3 = in billing retry, 4 = in grace period.
   * 2 (expired) and 5 (revoked) are not entitlements. Grace and retry ARE —
   * Apple is still trying to collect, and cutting a paying candidate off mid-
   * retry is how a transient card decline becomes a support ticket.
   */
  const status = entry.status ?? 0;
  const active = (status === 1 || status === 3 || status === 4) && !tx.revocationDate;

  const renewal = entry.signedRenewalInfo
    ? (decodeJwt(entry.signedRenewalInfo) as AppleRenewalInfo)
    : null;

  const purchase: VerifiedPurchase = {
    store: "apple",
    subscriptionId: tx.originalTransactionId,
    transactionId: tx.transactionId ?? null,
    productId: tx.productId,
    plan,
    periodStart: new Date(tx.purchaseDate ?? Date.now()),
    periodEnd: new Date(tx.expiresDate),
    active,
    // `autoRenewStatus` 0 means they have switched renewal off but are still
    // entitled until the period ends — exactly our `cancelAtPeriodEnd`.
    cancelAtPeriodEnd: renewal?.autoRenewStatus === 0,
    // Apple reports price in thousandths of a unit; the ledger holds hundredths.
    priceCents: typeof tx.price === "number" ? Math.round(tx.price / 10) : null,
    currency: tx.currency ?? null,
    sandbox: isSandbox,
  };

  return { ok: true, purchase };
}
