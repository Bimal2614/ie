import "server-only";

import { cookies, headers } from "next/headers";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { generateToken, hashToken } from "@/lib/security/tokens";
import { isProd } from "@/lib/env";

/**
 * In production the cookie uses the `__Host-` prefix, which the browser only
 * accepts when it is Secure, has Path=/ and NO Domain attribute — the strongest
 * cookie scoping available, immune to subdomain/`document.cookie` injection.
 * The prefix requires HTTPS, so dev (http://localhost) uses a plain name.
 */
export const SESSION_COOKIE = isProd ? "__Host-ielts_session" : "ielts_session";

// Idle timeout: session dies if unused for this long.
const IDLE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// Absolute cap: session always dies after this, even if active (replay cap).
const ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function cookieOptions(expires: Date) {
  return {
    httpOnly: true, // not readable by JS / console / XSS
    secure: isProd, // HTTPS-only in prod
    sameSite: "lax" as const, // blocks cross-site CSRF on the cookie
    path: "/",
    expires,
  };
}

/** Read client IP + UA from request headers (for audit + session binding). */
export async function getRequestContext() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const userAgent = h.get("user-agent");
  return { ip, userAgent };
}

/**
 * Create a fresh session for a user and set the cookie. Called on every login
 * and signup, so the session token is always rotated (defeats fixation/replay
 * of any pre-auth token).
 */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const now = Date.now();
  const idleExpiresAt = new Date(now + IDLE_TTL_MS);
  const absoluteExpiresAt = new Date(now + ABSOLUTE_TTL_MS);
  const { ip, userAgent } = await getRequestContext();

  await db.insert(sessions).values({
    userId,
    tokenHash,
    ipAddress: ip,
    userAgent,
    idleExpiresAt,
    absoluteExpiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(idleExpiresAt));
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  emailVerified: boolean;
  targetModule: "academic" | "general";
  targetBand: string | null;
  examDate: Date | null;
};

/**
 * Validate the session cookie against the DB. Read-only (safe to call during
 * render). Returns the user, or null if there is no valid, unexpired,
 * unrevoked session.
 */
export async function validateSession(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      emailVerified: users.emailVerified,
      targetModule: users.targetModule,
      targetBand: users.targetBand,
      // Drives the dashboard's exam countdown.
      examDate: users.examDate,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        // A deactivated account cannot use the app — reject its sessions.
        isNull(users.deactivatedAt),
        gt(sessions.idleExpiresAt, new Date()),
        gt(sessions.absoluteExpiresAt, new Date()),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Slide the idle window forward on activity (call from a mutation/route, not
 * during render). Best-effort; never blocks the request on failure.
 */
export async function touchSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;
  const tokenHash = hashToken(token);
  const newIdle = new Date(Date.now() + IDLE_TTL_MS);

  await db
    .update(sessions)
    .set({ lastUsedAt: new Date(), idleExpiresAt: newIdle })
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        // Never extend past the absolute cap.
        gt(sessions.absoluteExpiresAt, sql`now()`),
      ),
    );
}

/** Revoke the current session and clear the cookie (logout). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, tokenHash));
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Revoke every active session for a user ("log out everywhere"). */
export async function destroyAllSessions(userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
