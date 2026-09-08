import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/auth-routes";
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
 * Require a CANDIDATE — someone the study app is actually for.
 *
 * An admin runs the business and a partner runs a class; neither has a streak,
 * a plan or a practice history, so the candidate shell shows them an empty
 * dashboard, a locked practice nav and an Upgrade button for a product they
 * already own. Both are sent to their own panel instead.
 *
 * NOT a security boundary — nothing here is secret from an admin. It is a
 * routing rule, and it lives here so all seven candidate layouts get it by
 * calling one function rather than by remembering to repeat a redirect.
 */
export async function requireCandidate(): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (user.role !== "user") redirect(homeFor(user.role));
  return user;
}

/** A partner session, with the institution it may act for proven present. */
export type PartnerUser = AuthenticatedUser & { partnerId: string };

/**
 * Require a partner login, and hand back the institution it belongs to.
 *
 * THE `partnerId` IS THE SCOPE OF EVERY QUERY THE PANEL RUNS, so it is proven
 * here once rather than re-read from an argument later: a partner action that
 * took the institution id from its caller would be an endpoint for reading
 * another class's students. A partner row without one cannot exist through the
 * admin panel, and if one ever did it would have no students to show — so it is
 * turned away rather than shown an empty panel.
 *
 * Redirects to /dashboard, not /login: whoever this is IS signed in, they are
 * simply not a partner. Sending them to a login form they have already passed
 * is the loop that /logout exists to break.
 */
export async function requirePartner(): Promise<PartnerUser> {
  const user = await requireUser();
  if (user.role !== "partner" || !user.partnerId) redirect("/dashboard");
  return user as PartnerUser;
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
