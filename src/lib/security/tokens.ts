import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/**
 * Generate a cryptographically-random, URL-safe opaque token.
 * 32 bytes = 256 bits of entropy — infeasible to guess.
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Hash a token for at-rest storage. We store only the hash; the raw token
 * lives solely in the user's cookie / verification link. SHA-256 is correct
 * here (not bcrypt): the input is already high-entropy, so we just need a fast,
 * collision-resistant fingerprint, not a slow KDF.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time string comparison to avoid timing leaks on secret compares. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
