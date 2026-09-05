import { z } from "zod";

import { DEFAULT_CURRENCY, OFFERED_PLANS, type BillingCurrency } from "@/lib/plans";

/**
 * Strips one layer of wrapping quotes. `.env` parsers drop them, but shell
 * exports and hosting-panel env fields keep them literal, and a quoted value
 * such as `"IELTSVega <no-reply@x.com>"` then parses as one single (invalid)
 * address, which SMTP rejects with "501 5.1.7 Bad sender address syntax".
 * Applied only where quotes are never part of the value: hosts and addresses.
 */
function unquote(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];
  const isQuoted =
    (quote === '"' || quote === "'") && trimmed.length > 1 && trimmed.endsWith(quote);
  return (isQuoted ? trimmed.slice(1, -1) : trimmed).trim();
}

/**
 * Centralized, validated environment access. Importing this module fails fast
 * (at boot) if a required variable is missing or malformed, so we never ship a
 * half-configured server. Only ever import this from server code.
 */
const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // "true" forces TLS to Postgres (managed/hosted DBs). Local dev = "false".
  DATABASE_SSL: z.enum(["true", "false"]).default("false"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Canonical app origin, used for cookie/CSRF hardening in production.
  APP_URL: z.string().url().optional(),

  // --- Speaking AI band scoring (IELTS Speaking Evaluation service). Optional:
  //     the app boots and runs without them; speaking simply stays unscored
  //     until both are set. NO code-baked fallbacks: a missing URL is a config
  //     error, not a silent default pointing at somebody else's deployment. ---
  SPEAKING_API_URL: z.string().url().optional(),
  //     Shared secret, sent as the `X-API-Key` header. Without it every call
  //     comes back 401, so it counts towards "configured" just as much as the
  //     URL does.
  SPEAKING_API_KEY: z.string().optional(),

  // --- Writing AI band scoring (OpenAI). Optional: the app boots and
  //     runs without it; Writing simply stays unscored until the key is set. ---
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.4-mini"),

  // --- Transactional email (SMTP — any provider). Optional: without it,
  //     verification/reset emails are skipped (link is logged in dev). ---
  SMTP_HOST: z.string().transform(unquote).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().transform(unquote).optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().transform(unquote).optional(), // e.g. IELTSVega <no-reply@ieltsvega.com>

  // --- Google sign-in (OAuth 2.0). Optional: the button degrades gracefully
  //     when unset. Redirect URI = `${APP_URL}/api/auth/google/callback`. ---
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // --- Rate limiting (all configurable; sensible production defaults) ---
  // General API/action limits per authenticated user.
  RATE_LIMIT_GENERAL_PER_MINUTE: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_GENERAL_PER_DAY: z.coerce.number().int().positive().default(6000),
  // AI (Writing/Speaking scoring) — expensive, so tighter.
  RATE_LIMIT_AI_PER_DAY: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_AI_PER_ACCOUNT: z.coerce.number().int().positive().default(10000),
  RATE_LIMIT_AI_ACCOUNT_WINDOW_DAYS: z.coerce.number().int().positive().default(365),
  // Repeated throttling → deactivate the account after this many violations.
  RATE_LIMIT_VIOLATIONS_BEFORE_DEACTIVATE: z.coerce.number().int().positive().default(3),
  // Window over which violations accumulate toward deactivation.
  RATE_LIMIT_VIOLATION_WINDOW_DAYS: z.coerce.number().int().positive().default(30),

  // --- Scheduled jobs. The subscription sweep (/api/cron/subscriptions)
  //     authenticates with this. Optional, and the route stays CLOSED while it
  //     is unset: an unauthenticated sweep would let anyone churn the ledger. ---
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters").optional(),

  // --- Razorpay (recurring subscriptions). Optional: the app boots without
  //     them and every paid button falls back to saying checkout is
  //     unavailable, rather than opening a checkout that cannot charge.
  //     The KEY ID is public (the browser needs it to open Checkout) and is
  //     handed to the client by the checkout action, not by a NEXT_PUBLIC_
  //     variable — that way a deployment with no keys ships no key at all.
  //     The SECRET signs API calls and verifies the handler's signature; the
  //     WEBHOOK secret is a DIFFERENT value, set when you create the webhook
  //     in the Razorpay dashboard. ---
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  /*
   * The `plan_…` for each paid tier, created BY HAND in the Razorpay dashboard.
   *
   * IN THE ENVIRONMENT, not in src/lib/plans.ts, because a plan id is not a
   * property of the tier — it is a property of the Razorpay ACCOUNT. Test mode
   * and live mode issue different ids for the same plan, so an id committed
   * beside `priceCents` would work perfectly until the day the live keys went
   * in and then fail for everyone at once.
   *
   * Optional per tier: a tier with no id set simply cannot be bought, and says
   * so, rather than falling back to a plan that charges something else.
   */
  RAZORPAY_PLAN_PREMIUM: z.string().optional(),
  RAZORPAY_PLAN_PRO: z.string().optional(),
  /*
   * ...and the same tiers again, as the USD plans sold outside India.
   *
   * A SEPARATE PLAN, NOT A CONVERTED PRICE. A Razorpay plan's currency is
   * welded in at creation alongside its amount, so "Premium in dollars" is a
   * different `plan_…` that has to exist in the dashboard before a single
   * international candidate can be quoted one. Leaving these unset is a
   * supported state: `resolveBillingCurrency` still quotes rupees to everyone,
   * because a currency with no plan behind it is not on sale.
   *
   * Charging USD also needs INTERNATIONAL PAYMENTS enabled on the Razorpay
   * account. Without it the plan creates fine and the checkout is refused at
   * the gateway — which surfaces here as a `RazorpayApiError` naming the
   * currency, logged in full by the checkout action.
   */
  RAZORPAY_PLAN_PREMIUM_USD: z.string().optional(),
  RAZORPAY_PLAN_PRO_USD: z.string().optional(),
  /**
   * Let a Razorpay plan disagree with the price the pricing page advertises.
   *
   * FOR TESTING THE PAYMENT PATH WITH A ₹1 PLAN, and nothing else. Normally the
   * checkout reads the plan back and refuses to sell when its amount, currency
   * or cadence differ from src/lib/plans.ts — that check is the only thing
   * standing between "we advertise ₹2,499" and "the card is charged something
   * else", so it is not the kind of thing to leave switchable in production.
   *
   * IT IS IGNORED UNLESS THE KEY IS A TEST KEY. See `allowPlanMismatch()`: the
   * flag alone cannot do anything: with `rzp_live_…` keys it is refused and
   * logged, so this escaping into a production environment file weakens
   * nothing. That belt-and-braces is deliberate — an override that protects
   * real customers only when someone remembers to unset it is not a protection.
   */
  RAZORPAY_ALLOW_PLAN_MISMATCH: z.enum(["true", "false"]).default("false"),
  /**
   * Pretend every request comes from this ISO country, for pricing only.
   *
   * FOR SEEING THE USD CARDS ON A LAPTOP, where no CDN has written an
   * `x-vercel-ip-country` header and every visitor therefore looks Indian.
   * IGNORED IN PRODUCTION (see src/lib/payments/region.ts): a currency chosen by
   * an environment variable rather than by the caller would quote one price to
   * the entire world, which is precisely the bug this whole path exists to fix.
   */
  BILLING_TEST_COUNTRY: z.string().length(2).optional(),

  // --- S3 (speaking audio storage). Optional for the same reason. ---
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  S3_FOLDER_PREFIX: z.string().optional(),
});

export const env = EnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_SSL: process.env.DATABASE_SSL,
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  SPEAKING_API_URL: process.env.SPEAKING_API_URL,
  SPEAKING_API_KEY: process.env.SPEAKING_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  RATE_LIMIT_GENERAL_PER_MINUTE: process.env.RATE_LIMIT_GENERAL_PER_MINUTE,
  RATE_LIMIT_GENERAL_PER_DAY: process.env.RATE_LIMIT_GENERAL_PER_DAY,
  RATE_LIMIT_AI_PER_DAY: process.env.RATE_LIMIT_AI_PER_DAY,
  RATE_LIMIT_AI_PER_ACCOUNT: process.env.RATE_LIMIT_AI_PER_ACCOUNT,
  RATE_LIMIT_AI_ACCOUNT_WINDOW_DAYS: process.env.RATE_LIMIT_AI_ACCOUNT_WINDOW_DAYS,
  RATE_LIMIT_VIOLATIONS_BEFORE_DEACTIVATE: process.env.RATE_LIMIT_VIOLATIONS_BEFORE_DEACTIVATE,
  RATE_LIMIT_VIOLATION_WINDOW_DAYS: process.env.RATE_LIMIT_VIOLATION_WINDOW_DAYS,
  CRON_SECRET: process.env.CRON_SECRET,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  RAZORPAY_PLAN_PREMIUM: process.env.RAZORPAY_PLAN_PREMIUM,
  RAZORPAY_PLAN_PRO: process.env.RAZORPAY_PLAN_PRO,
  RAZORPAY_PLAN_PREMIUM_USD: process.env.RAZORPAY_PLAN_PREMIUM_USD,
  RAZORPAY_PLAN_PRO_USD: process.env.RAZORPAY_PLAN_PRO_USD,
  RAZORPAY_ALLOW_PLAN_MISMATCH: process.env.RAZORPAY_ALLOW_PLAN_MISMATCH,
  BILLING_TEST_COUNTRY: process.env.BILLING_TEST_COUNTRY,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  S3_FOLDER_PREFIX: process.env.S3_FOLDER_PREFIX,
});

export const isProd = env.NODE_ENV === "production";

/**
 * True when the Speaking evaluation service is configured for band scoring.
 *
 * BOTH values, not just the URL: the service authenticates every request, so a
 * URL with no key is not a working configuration — it is a deployment that 401s
 * on every answer while looking configured.
 */
export function isSpeakingAiConfigured(): boolean {
  return Boolean(env.SPEAKING_API_URL && env.SPEAKING_API_KEY);
}

/** True when OpenAI is configured for Writing band scoring. */
export function isWritingAiConfigured(): boolean {
  return Boolean(env.OPENAI_API_KEY);
}

/** True when SMTP is configured to actually send email. */
export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM);
}

/** True when the scheduled subscription sweep can authenticate callers. */
export function isCronConfigured(): boolean {
  return Boolean(env.CRON_SECRET);
}

/**
 * True when Razorpay can both open a checkout and sign an API call.
 *
 * BOTH keys, for the same reason the Speaking check wants both halves: a key id
 * with no secret opens a checkout that every server call behind it answers 401,
 * which looks configured right up to the moment someone tries to pay.
 * The webhook secret is deliberately NOT part of this — checkout works without
 * it (the signed handler activates the plan); what is lost is renewals, and
 * `isRazorpayWebhookConfigured` below is what guards that.
 */
export function isRazorpayConfigured(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

/**
 * The dashboard-created `plan_…` for a paid tier IN ONE CURRENCY, or undefined
 * if none is set.
 *
 * Keyed by the tier's own name and the currency, so adding either is env vars
 * rather than a code change — but read through a function rather than by
 * string-building the variable name, so a typo is a compile error instead of a
 * silent undefined.
 *
 * THERE IS NO CROSS-CURRENCY FALLBACK, deliberately. Handing back the rupee
 * plan when the dollar one is missing would charge ₹2,499 to a card that was
 * shown $29; the checkout refusing the sale is the correct failure.
 */
export function razorpayPlanIdFor(
  plan: "pro" | "premium",
  currency: BillingCurrency = DEFAULT_CURRENCY,
): string | undefined {
  if (currency === "USD") {
    return plan === "premium" ? env.RAZORPAY_PLAN_PREMIUM_USD : env.RAZORPAY_PLAN_PRO_USD;
  }
  return plan === "premium" ? env.RAZORPAY_PLAN_PREMIUM : env.RAZORPAY_PLAN_PRO;
}

/**
 * True when a tier can actually be SOLD in `currency` right now.
 *
 * What the pricing page's currency switch reads: offering a dollar price with
 * no dollar plan behind it produces a button that opens nothing and an error
 * the candidate cannot act on, so the switch simply does not appear until the
 * plans exist.
 */
export function isCurrencyOnSale(currency: BillingCurrency): boolean {
  return OFFERED_PLANS.every((plan) => Boolean(razorpayPlanIdFor(plan, currency)));
}

/** True when the configured Razorpay key is a TEST key rather than a live one. */
export function isRazorpayTestMode(): boolean {
  return (env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_test_");
}

/**
 * True when a Razorpay plan is allowed to charge something other than the
 * advertised price — the ₹1 test-plan escape hatch.
 *
 * BOTH CONDITIONS, and the second is not configurable. A live key refuses the
 * override however the environment is set, and says so loudly, because the
 * whole value of the price check is that it cannot be switched off by accident
 * on the deployment where it matters.
 */
export function allowPlanMismatch(): boolean {
  if (env.RAZORPAY_ALLOW_PLAN_MISMATCH !== "true") return false;
  if (!isRazorpayTestMode()) {
    console.error(
      "[razorpay] RAZORPAY_ALLOW_PLAN_MISMATCH is set on LIVE keys and is being ignored. " +
        "Unset it: a plan that disagrees with the pricing page must never be sold to a real customer.",
    );
    return false;
  }
  return true;
}

/**
 * True when the Razorpay webhook can authenticate a caller.
 *
 * The route stays CLOSED while this is unset, exactly as the cron sweep does:
 * an unverified webhook is an open endpoint for granting anyone a paid plan.
 */
export function isRazorpayWebhookConfigured(): boolean {
  return Boolean(env.RAZORPAY_WEBHOOK_SECRET);
}

/** True when Google OAuth is configured. */
export function isGoogleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/** True when S3 credentials + bucket + region are present. */
export function isS3Configured(): boolean {
  return Boolean(
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET_NAME && env.AWS_REGION,
  );
}
