import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authTokens } from "@/db/schema";
import { generateToken, hashToken } from "@/lib/security/tokens";

/**
 * Opaque, single-use, expiring auth tokens for email verification and password
 * reset. Only the hash is stored; the raw token lives only in the emailed link.
 */
export type AuthTokenType = "email_verify" | "password_reset";

const TTL_MS: Record<AuthTokenType, number> = {
  email_verify: 24 * 60 * 60 * 1000, // 24h
  password_reset: 60 * 60 * 1000, // 1h
};

/** Issue a token for a user; returns the RAW token to embed in a link. */
export async function createAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const raw = generateToken();
  await db.insert(authTokens).values({
    userId,
    tokenHash: hashToken(raw),
    type,
    expiresAt: new Date(Date.now() + TTL_MS[type]),
  });
  return raw;
}

/**
 * Validate + consume a token (single-use). Returns the userId if the token is
 * valid, unexpired and unused; otherwise null. Marks it used atomically enough
 * for our needs (single app; the update is idempotent per row).
 */
export async function consumeAuthToken(raw: string, type: AuthTokenType): Promise<string | null> {
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const [row] = await db
    .select({ id: authTokens.id, userId: authTokens.userId })
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, tokenHash),
        eq(authTokens.type, type),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) return null;
  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, row.id));
  return row.userId;
}
