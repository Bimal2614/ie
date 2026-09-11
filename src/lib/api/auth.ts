import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE, validateSessionToken, type AuthenticatedUser, type SessionClient } from "@/lib/session";
import { forbidden, unauthenticated } from "@/lib/api/errors";

/**
 * Authentication for the JSON API.
 *
 * The web app authenticates through `src/lib/dal.ts`, which `redirect()`s to
 * /login when there is no session. That is right for a page and catastrophic
 * for an endpoint: the app would receive a 307 to an HTML login form and report
 * it as "could not parse response". Everything here throws an `ApiError`
 * instead, which `apiRoute` renders as a 401 the client can actually act on.
 */

/** Pull the raw token out of `Authorization: Bearer <token>`. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  // Case-insensitive scheme: RFC 7235 says so, and Dio/OkHttp both normalise
  // differently depending on how the interceptor was written.
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token ? token : null;
}

/**
 * Which client is calling, for session scoping.
 *
 * Sent as `X-Client-Platform` by the app. It is a HINT, not a credential: it
 * decides which of the caller's own sessions a new login evicts and nothing
 * else, so a forged value can only cost the forger their own other session.
 * Never gate anything on it.
 */
export function clientFrom(req: Request): SessionClient {
  const raw = req.headers.get("x-client-platform")?.trim().toLowerCase();
  return raw === "ios" || raw === "android" ? raw : "web";
}

/**
 * Resolve the caller, or null.
 *
 * Bearer first, cookie second. The cookie fallback is what lets the browser hit
 * these endpoints directly — useful for debugging, and the path the web app
 * would take if it ever moves onto this API — and it is not a CSRF hole because
 * the session cookie is `SameSite=Lax`, which a cross-site POST does not carry.
 *
 * `cache()` memoises per request, so a handler may call this and a guard may
 * call it again without a second round trip to Postgres.
 */
export const apiUser = cache(async (req: Request): Promise<AuthenticatedUser | null> => {
  const token = bearerToken(req);
  if (token) return validateSessionToken(token);

  const cookieStore = await cookies();
  return validateSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
});

/** Require any signed-in account, or 401. */
export async function requireApiUser(req: Request): Promise<AuthenticatedUser> {
  const user = await apiUser(req);
  if (!user) throw unauthenticated();
  return user;
}

/**
 * Require a CANDIDATE — the role the app is for.
 *
 * An admin and a partner have no practice history, no streak and no plan, so
 * every candidate endpoint would answer them with a convincing-looking empty
 * object. Turning them away with a clear error beats that.
 */
export async function requireApiCandidate(req: Request): Promise<AuthenticatedUser> {
  const user = await requireApiUser(req);
  if (user.role !== "user") {
    throw forbidden("This endpoint is for candidate accounts.");
  }
  return user;
}

/** Require an admin, or 403. */
export async function requireApiAdmin(req: Request): Promise<AuthenticatedUser> {
  const user = await requireApiUser(req);
  if (user.role !== "admin") throw forbidden("Admins only.");
  return user;
}

/** A partner session with its institution proven present — the scope of every query it runs. */
export type ApiPartnerUser = AuthenticatedUser & { partnerId: string };

/** Require a partner login, and hand back the institution it may act for. */
export async function requireApiPartner(req: Request): Promise<ApiPartnerUser> {
  const user = await requireApiUser(req);
  if (user.role !== "partner" || !user.partnerId) throw forbidden("Partner accounts only.");
  return user as ApiPartnerUser;
}
