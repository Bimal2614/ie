"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, auditLog } from "@/db/schema";
import { signupSchema, loginSchema, type AuthFormState } from "@/lib/validation";
import { hashPassword, verifyPassword, fakeVerify } from "@/lib/security/password";
import { rateLimit, clearRateLimit } from "@/lib/security/rate-limit";
import {
  createSession,
  destroySession,
  getRequestContext,
} from "@/lib/session";
import { getCurrentUser } from "@/lib/dal";

// Identical message for "no such user" and "wrong password" — no enumeration.
const INVALID_CREDENTIALS = "Incorrect email or password.";

const LOCKOUT_THRESHOLD = 5; // failed attempts before the account locks
const LOCKOUT_BASE_MS = 15 * 60 * 1000; // 15 min, doubling each further failure
const LOCKOUT_CAP_MS = 24 * 60 * 60 * 1000; // capped at 24h

function lockoutMs(attempts: number): number {
  const over = Math.max(0, attempts - LOCKOUT_THRESHOLD);
  return Math.min(LOCKOUT_BASE_MS * 2 ** over, LOCKOUT_CAP_MS);
}

async function audit(
  userId: string | null,
  event: string,
  ip: string | null,
  userAgent: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLog).values({ userId, event, ipAddress: ip, userAgent, metadata });
  } catch {
    // Never let audit logging break the auth flow.
  }
}

/**
 * True for a Postgres unique_violation (23505) — here, a duplicate email on the
 * users_email_normalized_uq index.
 *
 * The code has to be hunted down the cause chain: Drizzle wraps driver errors
 * in a DrizzleQueryError, so `err.code` is undefined and only `err.cause.code`
 * carries 23505. Checking the top-level error alone silently misses every
 * duplicate signup and rethrows as a 500 that dumps the INSERT — bcrypt hash
 * included — into the response.
 */
function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err; e != null; e = (e as { cause?: unknown }).cause) {
    if (typeof e === "object" && "code" in e && (e as { code?: unknown }).code === "23505") {
      return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * Sign up
 * ------------------------------------------------------------------ */
export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    targetModule: formData.get("targetModule") ?? "academic",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { name, email, password, targetModule } = parsed.data;
  const { ip, userAgent } = await getRequestContext();

  // Throttle account creation per network.
  const limit = await rateLimit(`signup:ip:${ip ?? "unknown"}`, 10, 60 * 60);
  if (!limit.allowed) {
    return { error: "Too many sign-ups from this network. Please try again later." };
  }

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const [created] = await db
      .insert(users)
      .values({ name, email, emailNormalized: email, passwordHash, targetModule })
      .returning({ id: users.id });
    userId = created.id;
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { fieldErrors: { email: ["An account with this email already exists."] } };
    }
    throw err;
  }

  await createSession(userId); // rotates in a fresh session token
  await audit(userId, "signup", ip, userAgent);
  redirect("/dashboard");
}

/* ------------------------------------------------------------------ *
 * Log in
 * ------------------------------------------------------------------ */
export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { email, password } = parsed.data;
  const { ip, userAgent } = await getRequestContext();

  // Two independent limiters: per-network and per-account.
  const ipLimit = await rateLimit(`login:ip:${ip ?? "unknown"}`, 30, 15 * 60);
  const emailLimit = await rateLimit(`login:email:${email}`, 8, 15 * 60);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const wait = Math.max(ipLimit.retryAfterSec, emailLimit.retryAfterSec);
    return { error: `Too many attempts. Please try again in about ${Math.ceil(wait / 60)} minute(s).` };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, email))
    .limit(1);

  // Unknown account: still spend bcrypt time, then give the generic error.
  if (!user) {
    await fakeVerify(password);
    await audit(null, "login.fail.unknown_user", ip, userAgent, { email });
    return { error: INVALID_CREDENTIALS };
  }

  // Honor an active lockout.
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await audit(user.id, "login.blocked.locked", ip, userAgent);
    return { error: "Account temporarily locked due to failed attempts. Try again later." };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      attempts >= LOCKOUT_THRESHOLD ? new Date(Date.now() + lockoutMs(attempts)) : null;
    await db
      .update(users)
      .set({ failedLoginAttempts: attempts, lockedUntil })
      .where(eq(users.id, user.id));
    await audit(user.id, "login.fail", ip, userAgent, { attempts });
    return { error: INVALID_CREDENTIALS };
  }

  // Success: reset counters, bind last-login, rotate session, clear throttle.
  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip })
    .where(eq(users.id, user.id));
  await clearRateLimit(`login:email:${email}`);
  await createSession(user.id);
  await audit(user.id, "login.success", ip, userAgent);
  redirect("/dashboard");
}

/* ------------------------------------------------------------------ *
 * Log out
 * ------------------------------------------------------------------ */
export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  const { ip, userAgent } = await getRequestContext();
  await destroySession();
  if (user) await audit(user.id, "logout", ip, userAgent);
  redirect("/login");
}
