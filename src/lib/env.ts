import { z } from "zod";

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

  // --- Writing AI band scoring (Google Gemini). Optional: the app boots and
  //     runs without it; Writing simply stays unscored until the key is set. ---
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

  // --- Transactional email (SMTP — any provider). Optional: without it,
  //     verification/reset emails are skipped (link is logged in dev). ---
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(), // e.g. "IELTSAce <no-reply@ieltsace.com>"

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
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
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

/** True when Gemini is configured for Writing band scoring. */
export function isWritingAiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

/** True when SMTP is configured to actually send email. */
export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM);
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
