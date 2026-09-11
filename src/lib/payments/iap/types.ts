import "server-only";

/**
 * What a verified store purchase tells us, in one shape.
 *
 * Apple and Google describe a subscription completely differently — Apple signs
 * a JWS transaction, Google answers a REST call with a nested resource — so each
 * verifier normalises to this and everything downstream (activation, the
 * ledger, the webhooks) is written once against it.
 *
 * EVERY FIELD HERE COMES FROM THE STORE, never from the app. The client hands us
 * a receipt or a token and nothing else; the tier, the price, the currency and
 * the expiry are all read back from Apple or Google. A client that could name
 * its own tier could buy the cheapest product and claim Premium.
 */
export type VerifiedPurchase = {
  store: "apple" | "google";
  /**
   * The stable identity of this SUBSCRIPTION across its whole life, not of one
   * payment: Apple's `originalTransactionId`, Google's `purchaseToken` (or its
   * linked original). Renewals reuse it, which is what lets a renewal update
   * the existing row instead of creating a second subscription.
   */
  subscriptionId: string;
  /** The store's id for THIS payment, when there is one. For the ledger. */
  transactionId: string | null;
  /** The product as the store names it. Mapped to a tier by the caller. */
  productId: string;
  /** The tier this product sells, resolved from configuration. */
  plan: "pro" | "premium";
  /** When the current paid window began. */
  periodStart: Date;
  /** When it closes. Entitlement is withdrawn here if it does not renew. */
  periodEnd: Date;
  /**
   * Whether the subscription is live RIGHT NOW according to the store —
   * distinct from `periodEnd` being in the future, because a refunded or
   * revoked purchase can still have time on the clock.
   */
  active: boolean;
  /** Set when the candidate has turned off renewal but is still entitled. */
  cancelAtPeriodEnd: boolean;
  /**
   * What they actually paid, in minor units of `currency`.
   *
   * The STOREFRONT's figure, not ours. Store price tiers are fixed and vary by
   * country, so a Premium sale in India and one in Germany are different
   * numbers and neither need match src/lib/plans.ts. Recording our own price
   * here would make the revenue ledger fiction.
   */
  priceCents: number | null;
  currency: string | null;
  /** Apple's Sandbox purchases must never grant a real plan in production. */
  sandbox: boolean;
};

export type VerifyResult =
  | { ok: true; purchase: VerifiedPurchase }
  | {
      ok: false;
      reason:
        /** The store credentials are missing — our problem, not the caller's. */
        | "not_configured"
        /** The store rejected the receipt, or the signature did not verify. */
        | "invalid"
        /** Verified, but for a product we do not sell a tier for. */
        | "unknown_product"
        /** Verified, but the purchase is expired, refunded or revoked. */
        | "not_active"
        /** The store itself was unreachable. Retryable. */
        | "store_unavailable";
      message: string;
    };
