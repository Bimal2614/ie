import "server-only";

import { cookies, headers } from "next/headers";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { effectivePlan, toPlanKey, type PlanKey } from "@/lib/plans";
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

/**
 * The Set-Cookie that removes the session cookie.
 *
 * Deliberately NOT `cookies().delete(name)`: that emits the cookie with only
 * `Path=/` and an expiry in the past — no `Secure`. The browser refuses any
 * Set-Cookie for a `__Host-`prefixed name that isn't Secure + Path=/ + no
 * Domain, so in production the deletion was silently dropped and the cookie
 * survived logout (→ /dashboard → /logout → /login → /dashboard forever).
 * Expiring it with the same attributes it was written with is what actually
 * clears it.
 */
export function clearedSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: "",
    ...cookieOptions(new Date(0)),
    maxAge: 0,
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

  // ONE DEVICE AT A TIME.
  //
  // Signing in anywhere revokes every other live session for this user, so the
  // previously signed-in browser/device is logged out on its very next request
  // or API call — validateSession() rejects rows with revokedAt set, and it runs
  // on every request, so there is no window where both stay usable.
  //
  // Enforced here rather than at the call sites (login / signup / Google OAuth)
  // so any future entry point inherits it automatically. Both statements share
  // one transaction: a user can never end up with two live sessions, or none.
  await db.transaction(async (tx) => {
    await tx
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

    await tx.insert(sessions).values({
      userId,
      tokenHash,
      ipAddress: ip,
      userAgent,
      idleExpiresAt,
      absoluteExpiresAt,
    });
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
  /** NULL for Google accounts that arrived without one — AppShell prompts. */
  phone: string | null;
  targetModule: "academic" | "general";
  targetBand: string | null;
  examDate: Date | null;

  /**
   * The tier the account is entitled to RIGHT NOW.
   *
   * Already resolved against the expiry, so callers never repeat that check and
   * cannot forget it: a lapsed Pro account reads as "free" here even in the
   * window before the nightly sweep rewrites the column. Every gate in
   * src/lib/security/plan-guard.ts reads this field.
   */
  plan: PlanKey;
  /** When the paid period runs out. NULL on free, and on plans that never lapse. */
  planExpiresAt: Date | null;
  /** The tier stored on the row, before expiry was applied — for support/UI. */
  storedPlan: PlanKey;
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
      phone: users.phone,
      targetModule: users.targetModule,
      targetBand: users.targetBand,
      // Drives the dashboard's exam countdown.
      examDate: users.examDate,
      // Entitlement travels WITH the session: every gated action already loads
      // this row to authenticate, so gating costs no extra query.
      plan: users.plan,
      planExpiresAt: users.planExpiresAt,
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

  const row = rows[0];
  if (!row) return null;

  const storedPlan = toPlanKey(row.plan);
  return {
    ...row,
    storedPlan,
    // Resolved here, once, rather than at each call site.
    plan: effectivePlan(storedPlan, row.planExpiresAt),
  };
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
  cookieStore.set(clearedSessionCookie());
}

/** Revoke every active session for a user ("log out everywhere"). */
export async function destroyAllSessions(userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
