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

  // --- Speaking AI scoring (SpeechSuper). All optional: the app boots and
  //     runs without them; speaking simply stays unscored until they're set.
  //     Names match the PTE app so the same credentials drop straight in.
  //     NO code-baked fallbacks — every value comes from the environment. ---
  SPEECHSUPER_API_KEY: z.string().optional(),
  SPEECHSUPER_SECRET_KEY: z.string().optional(),
  SPEECHSUPER_BASE_URL: z.string().url().optional(),

  // --- Writing AI band scoring (Google Gemini). Optional: the app boots and
  //     runs without it; Writing simply stays unscored until the key is set. ---
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

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
  SPEECHSUPER_API_KEY: process.env.SPEECHSUPER_API_KEY,
  SPEECHSUPER_SECRET_KEY: process.env.SPEECHSUPER_SECRET_KEY,
  SPEECHSUPER_BASE_URL: process.env.SPEECHSUPER_BASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
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
 * True only when SpeechSuper is fully configured — both keys AND the base URL.
 * The URL is required (no code default), so a missing one is a config error,
 * not a silent hardcoded fallback.
 */
export function isSpeechSuperConfigured(): boolean {
  return Boolean(env.SPEECHSUPER_API_KEY && env.SPEECHSUPER_SECRET_KEY && env.SPEECHSUPER_BASE_URL);
}

/** True when Gemini is configured for Writing band scoring. */
export function isWritingAiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

/** True when S3 credentials + bucket + region are present. */
export function isS3Configured(): boolean {
  return Boolean(
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET_NAME && env.AWS_REGION,
  );
}
