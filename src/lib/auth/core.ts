import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, auditLog } from "@/db/schema";
import { hashPassword, verifyPassword, fakeVerify } from "@/lib/security/password";
import { rateLimit, clearRateLimit } from "@/lib/security/rate-limit";
import { isUniqueViolation } from "@/lib/db-errors";
import { sendEmail } from "@/lib/email/mailer";
import { welcomeTemplate } from "@/lib/email/templates";
import { env } from "@/lib/env";
import type { SignupInput } from "@/lib/validation";

/**
 * Credential authentication, independent of how it was asked for.
 *
 * WHY THIS EXISTS. Sign-up and sign-in used to live entirely inside the Server
 * Actions in `src/app/actions/auth.ts` — throttling, the lockout ladder, the
 * anti-enumeration timing, the audit trail, all of it interleaved with FormData
 * parsing and `redirect()`. The moment the mobile API needed the same rules, the
 * only options were to import an action that redirects (it would 307 the app to
 * an HTML login page) or to write them a second time. A second copy of a lockout
 * ladder is how one of the two ends up without one.
 *
 * So the rules live here and return a RESULT. The action renders that result as
 * form state; the route renders it as JSON. Neither owns the policy.
 */

const INVALID_CREDENTIALS = "Incorrect email or password.";

const LOCKOUT_THRESHOLD = 5; // failed attempts before the account locks
const LOCKOUT_BASE_MS = 15 * 60 * 1000; // 15 min, doubling each further failure
const LOCKOUT_CAP_MS = 24 * 60 * 60 * 1000; // capped at 24h

function lockoutMs(attempts: number): number {
  const over = Math.max(0, attempts - LOCKOUT_THRESHOLD);
  return Math.min(LOCKOUT_BASE_MS * 2 ** over, LOCKOUT_CAP_MS);
}

/** Where the request came from — passed in, because a route and an action read it differently. */
export type RequestOrigin = { ip: string | null; userAgent: string | null };

export async function audit(
  userId: string | null,
  event: string,
  origin: RequestOrigin,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      userId,
      event,
      ipAddress: origin.ip,
      userAgent: origin.userAgent,
      metadata,
    });
  } catch {
    // Never let audit logging break the auth flow.
  }
}

/* ------------------------------------------------------------------ *
 * Results
 * ------------------------------------------------------------------ */

export type AuthFailureCode =
  /** Somebody already has this email. The only field-shaped failure here. */
  | "email_taken"
  /** Wrong password, or no such account. Deliberately indistinguishable. */
  | "invalid_credentials"
  /** A Google account with no password set — sign in the other way. */
  | "oauth_only"
  /** Locked by the failed-attempt ladder, or deactivated. */
  | "locked"
  /** Too many attempts from this network or against this address. */
  | "throttled";

export type AuthSuccess = {
  ok: true;
  userId: string;
  role: "user" | "admin" | "partner";
};

export type AuthFailure = {
  ok: false;
  code: AuthFailureCode;
  message: string;
  /** Present on `throttled`, so both clients can say how long. */
  retryAfterSec?: number;
};

export type AuthResult = AuthSuccess | AuthFailure;

/* ------------------------------------------------------------------ *
 * Sign up
 * ------------------------------------------------------------------ */

/**
 * Create an account. Does NOT create a session — the caller decides whether
 * that session is delivered as a cookie or as a bearer token.
 *
 * The welcome mail is best-effort: a mail outage must never fail account
 * creation, and the candidate finding out later beats them not having an
 * account at all.
 */
export async function registerAccount(
  input: SignupInput,
  origin: RequestOrigin,
): Promise<AuthResult> {
  const { name, email, phone, password, targetModule } = input;

  // Throttle account creation per network.
  const limit = await rateLimit(`signup:ip:${origin.ip ?? "unknown"}`, 10, 60 * 60);
  if (!limit.allowed) {
    return {
      ok: false,
      code: "throttled",
      message: "Too many sign-ups from this network. Please try again later.",
      retryAfterSec: limit.retryAfterSec,
    };
  }

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const [created] = await db
      .insert(users)
      .values({ name, email, emailNormalized: email, phone, passwordHash, targetModule })
      .returning({ id: users.id });
    userId = created.id;
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        code: "email_taken",
        message: "An account with this email already exists.",
      };
    }
    throw err;
  }

  await audit(userId, "signup", origin);

  // No verification step for now: addresses are taken at face value and nothing
  // in the app gates on `emailVerified`.
  try {
    const t = welcomeTemplate(name, `${env.APP_URL ?? "https://ieltsvega.com"}/dashboard`);
    await sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text });
  } catch {
    // A mail outage must not fail account creation.
  }

  return { ok: true, userId, role: "user" };
}

/* ------------------------------------------------------------------ *
 * Log in
 * ------------------------------------------------------------------ */

/**
 * Verify an email + password. Does NOT create a session, for the same reason
 * `registerAccount` does not.
 *
 * Every failure path spends bcrypt time before answering, so "no such account"
 * and "wrong password" are indistinguishable in wording and in latency alike.
 */
export async function authenticate(
  email: string,
  password: string,
  origin: RequestOrigin,
): Promise<AuthResult> {
  // Two independent limiters: per-network and per-account.
  const ipLimit = await rateLimit(`login:ip:${origin.ip ?? "unknown"}`, 30, 15 * 60);
  const emailLimit = await rateLimit(`login:email:${email}`, 8, 15 * 60);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const wait = Math.max(ipLimit.retryAfterSec, emailLimit.retryAfterSec);
    return {
      ok: false,
      code: "throttled",
      message: `Too many attempts. Please try again in about ${Math.ceil(wait / 60)} minute(s).`,
      retryAfterSec: wait,
    };
  }

  const [user] = await db.select().from(users).where(eq(users.emailNormalized, email)).limit(1);

  // Unknown account: still spend bcrypt time, then give the generic error.
  if (!user) {
    await fakeVerify(password);
    await audit(null, "login.fail.unknown_user", origin, { email });
    return { ok: false, code: "invalid_credentials", message: INVALID_CREDENTIALS };
  }

  // OAuth-only account (Google, no password). Spend bcrypt time, then nudge to
  // the right method without confirming the account exists to a stranger.
  if (!user.passwordHash) {
    await fakeVerify(password);
    return {
      ok: false,
      code: "oauth_only",
      message: "This account uses Google sign-in. Please continue with Google.",
    };
  }

  /**
   * A deactivated account cannot sign in at all.
   *
   * `validateSessionToken` already refuses a session whose user is deactivated,
   * so issuing one here would hand the app a token that fails on its very next
   * request — which it can only report as a mysterious instant logout. Refusing
   * at the door gives the candidate the real reason instead.
   */
  if (user.deactivatedAt) {
    await fakeVerify(password);
    await audit(user.id, "login.blocked.deactivated", origin);
    return {
      ok: false,
      code: "locked",
      message: "This account has been deactivated. Please contact support.",
    };
  }

  // Honor an active lockout.
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await audit(user.id, "login.blocked.locked", origin);
    return {
      ok: false,
      code: "locked",
      message: "Account temporarily locked due to failed attempts. Try again later.",
    };
  }

  const okPassword = await verifyPassword(password, user.passwordHash);
  if (!okPassword) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      attempts >= LOCKOUT_THRESHOLD ? new Date(Date.now() + lockoutMs(attempts)) : null;
    await db
      .update(users)
      .set({ failedLoginAttempts: attempts, lockedUntil })
      .where(eq(users.id, user.id));
    await audit(user.id, "login.fail", origin, { attempts });
    return { ok: false, code: "invalid_credentials", message: INVALID_CREDENTIALS };
  }

  // Success: reset counters, bind last-login, clear the per-address throttle.
  await db
    .update(users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: origin.ip,
    })
    .where(eq(users.id, user.id));
  await clearRateLimit(`login:email:${email}`);
  await audit(user.id, "login.success", origin);

  return { ok: true, userId: user.id, role: user.role };
}
