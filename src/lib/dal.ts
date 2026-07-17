import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateSession, SESSION_COOKIE, type AuthenticatedUser } from "@/lib/session";

/**
 * Data Access Layer — the single, centralized place auth is enforced.
 *
 * `cache()` memoizes the session lookup for the duration of one server render
 * pass, so calling `getCurrentUser()` in the layout, the page, and a leaf
 * component triggers only one DB query.
 */
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  return validateSession();
});

/** Require auth or redirect to /login. Use at the top of protected pages/actions. */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) redirect(await rejectPath());
  return user;
}

/** Require an admin or redirect. Defense-in-depth alongside route protection. */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

/**
 * Where to send a request that failed the DB check.
 *
 * A cookie that outlived its session (revoked, or idled out past 7 days) still
 * looks valid to proxy.ts, which routes on cookie presence alone. Sending such
 * a request to /login would bounce it right back here — /login → /dashboard →
 * /login — so it goes via /logout, which clears the cookie first. Without a
 * cookie there is nothing to clear, so /login is safe and cheaper.
 */
async function rejectPath(): Promise<string> {
  const hasStaleCookie = (await cookies()).has(SESSION_COOKIE);
  return hasStaleCookie ? "/logout" : "/login";
}
