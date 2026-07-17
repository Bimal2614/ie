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

/** True when S3 credentials + bucket + region are present. */
export function isS3Configured(): boolean {
  return Boolean(
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET_NAME && env.AWS_REGION,
  );
}
