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

/** Which client a session belongs to. `web` is cookie-borne, the rest bearer-borne. */
export type SessionClient = "web" | "ios" | "android";

/** What a freshly-minted session hands back to whoever has to deliver it. */
export type IssuedSession = {
  /** The raw token. Never stored — only its SHA-256 hash is. */
  token: string;
  /** When the idle window closes, if untouched. Cookie expiry / app refresh cue. */
  expiresAt: Date;
  /** The absolute cap. The app must re-authenticate past this no matter what. */
  absoluteExpiresAt: Date;
};

/**
 * Mint a session row and return its raw token WITHOUT delivering it.
 *
 * Split out from `createSession` because the two clients deliver the same token
 * by different means: the browser gets a `__Host-` cookie, the app gets the
 * string in a JSON body and puts it in an `Authorization: Bearer` header. The
 * token, the table, the expiries and the revocation rules are identical — only
 * the transport differs, and that is the only thing that should differ.
 */
export async function createSessionToken(
  userId: string,
  client: SessionClient = "web",
): Promise<IssuedSession> {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const now = Date.now();
  const idleExpiresAt = new Date(now + IDLE_TTL_MS);
  const absoluteExpiresAt = new Date(now + ABSOLUTE_TTL_MS);
  const { ip, userAgent } = await getRequestContext();

  // ONE SESSION PER CLIENT.
  //
  // Signing in revokes every other live session FOR THE SAME CLIENT, so a
  // second browser — or a second phone of the same platform — is logged out on
  // its very next request: validateSession() rejects rows with revokedAt set,
  // and it runs on every request, so there is no window where both stay usable.
  //
  // WHY IT IS SCOPED BY CLIENT AND NOT BY ACCOUNT, which it was until the API
  // existed. With one live session per ACCOUNT, a candidate who opened the app
  // was signed out of the website, and signing back in on the website killed the
  // app — an unwinnable loop for the very normal habit of writing on a laptop
  // and doing speaking practice on a phone. Scoped this way the intent survives
  // (a login is still not a licence to share an account around a classroom)
  // without the two halves of our own product evicting each other.
  //
  // Enforced here rather than at the call sites (login / signup / Google) so any
  // future entry point inherits it. Both statements share one transaction: a
  // user can never end up with two live sessions on a client, or none.
  await db.transaction(async (tx) => {
    await tx
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.client, client),
          isNull(sessions.revokedAt),
        ),
      );

    await tx.insert(sessions).values({
      userId,
      tokenHash,
      client,
      ipAddress: ip,
      userAgent,
      idleExpiresAt,
      absoluteExpiresAt,
    });
  });

  return { token, expiresAt: idleExpiresAt, absoluteExpiresAt };
}

/**
 * Create a fresh session for a user and set the cookie. Called on every login
 * and signup, so the session token is always rotated (defeats fixation/replay
 * of any pre-auth token).
 */
export async function createSession(userId: string): Promise<void> {
  const { token, expiresAt } = await createSessionToken(userId, "web");
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "partner";
  /**
   * The institution behind this session, for the two roles that have one: a
   * partner's own login and every student that partner enrolled. NULL for
   * everyone else, including admins.
   *
   * Carried on the session because the partner panel's gate needs it on every
   * request — `requirePartner()` answers "is this a partner, and whose data may
   * it see?" from the row it already loaded, with no second query and no chance
   * of the two answers disagreeing.
   */
  partnerId: string | null;
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
 * Validate a RAW session token against the DB. Read-only (safe to call during
 * render). Returns the user, or null if there is no valid, unexpired,
 * unrevoked session behind that token.
 *
 * Transport-agnostic on purpose: the browser's cookie and the app's bearer
 * header both end up here, so a session means exactly the same thing — the same
 * expiries, the same revocation, the same deactivated-account check — whichever
 * one carried it. Anything gated in one client is gated in the other, because
 * there is only one implementation to keep in step.
 */
/**
 * The columns that make up an `AuthenticatedUser`.
 *
 * Named once so the session lookup and `authenticatedUserById` cannot drift
 * apart — a field added to one and not the other is a field that exists on the
 * web and is missing in the app, or vice versa.
 */
const AUTH_USER_COLUMNS = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  partnerId: users.partnerId,
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
} as const;

/** Apply the expiry rule once, here, rather than at each call site. */
function toAuthenticatedUser(
  row: Omit<AuthenticatedUser, "storedPlan" | "plan"> & { plan: string },
): AuthenticatedUser {
  const storedPlan = toPlanKey(row.plan);
  return { ...row, storedPlan, plan: effectivePlan(storedPlan, row.planExpiresAt) };
}

/**
 * Load a user by id, with no session involved.
 *
 * For the paths that have already authenticated and then CHANGED the row —
 * a profile edit, a plan grant — and need to answer with what the next request
 * would see. Re-reading beats patching the in-memory copy: a `plan` written by
 * a webhook a moment ago is reflected, and the expiry rule is applied by the
 * same function the session path uses.
 */
export async function authenticatedUserById(userId: string): Promise<AuthenticatedUser | null> {
  const rows = await db
    .select(AUTH_USER_COLUMNS)
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deactivatedAt)))
    .limit(1);

  return rows[0] ? toAuthenticatedUser(rows[0]) : null;
}

export async function validateSessionToken(
  token: string | undefined | null,
): Promise<AuthenticatedUser | null> {
  if (!token) return null;

  const tokenHash = hashToken(token);
  const rows = await db
    .select(AUTH_USER_COLUMNS)
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

  return rows[0] ? toAuthenticatedUser(rows[0]) : null;
}

/**
 * The raw session token on the CURRENT request, whichever way it was carried.
 *
 * Bearer header first, cookie second. Both `headers()` and `cookies()` work in
 * a Server Component, a Server Action and a Route Handler alike, so this one
 * function serves every entry point the app has.
 *
 * WHY THE HEADER IS READ HERE RATHER THAN ONLY IN THE API LAYER. Every data
 * function in src/app/actions/* begins with `requireUser()`, which lands here.
 * Teaching this one place about bearer tokens makes that ENTIRE surface —
 * mock sittings, history, results, the practice library — callable from a route
 * handler on behalf of a mobile client, with no per-function rewrite and, more
 * to the point, no second copy of any ownership check to keep in step.
 *
 * It adds no CSRF exposure: a browser never attaches an `Authorization` header
 * on its own, so a cross-site page cannot cause one to be sent. Anyone able to
 * set it already holds a token, which is strictly more than holding a cookie.
 */
async function currentRequestToken(): Promise<string | undefined> {
  const h = await headers();
  const authorization = h.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    const token = match?.[1]?.trim();
    if (token) return token;
  }

  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

/**
 * Validate the session on the current request — the entry point every page,
 * action and route handler reaches through `requireUser()`.
 */
export async function validateSession(): Promise<AuthenticatedUser | null> {
  return validateSessionToken(await currentRequestToken());
}

/**
 * Slide the idle window forward on activity, by raw token (call from a
 * mutation/route, not during render). Best-effort; never blocks on failure.
 */
export async function touchSessionToken(token: string | undefined | null): Promise<void> {
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

/** Slide the idle window forward for whichever session carried this request. */
export async function touchSession(): Promise<void> {
  await touchSessionToken(await currentRequestToken());
}

/**
 * Revoke one session by its raw token — the app's logout.
 *
 * Idempotent, and deliberately silent about whether the token matched anything:
 * an already-revoked or expired token is a successful logout, not an error, and
 * saying otherwise would turn this into an oracle for guessing live tokens.
 */
export async function destroySessionToken(token: string | undefined | null): Promise<void> {
  if (!token) return;
  const tokenHash = hashToken(token);
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, tokenHash));
}

/**
 * Revoke the current session and clear the cookie (the website's logout).
 *
 * Reads the cookie SPECIFICALLY, not `currentRequestToken()`: this is the
 * browser's path, it always ends by clearing the cookie, and revoking whatever
 * a stray `Authorization` header named while expiring the cookie would sign the
 * user out of two clients at once. The app's logout is its own route.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  await destroySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  cookieStore.set(clearedSessionCookie());
}

/** Revoke every active session for a user ("log out everywhere"). */
export async function destroyAllSessions(userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
