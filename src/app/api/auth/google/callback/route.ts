import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isGoogleConfigured } from "@/lib/env";
import { exchangeGoogleCode, fetchGoogleProfile } from "@/lib/oauth/google";
import { linkOrCreateGoogleAccount } from "@/lib/auth/google-account";
import { createSession } from "@/lib/session";
import { safeEqual } from "@/lib/security/tokens";

/**
 * Google OAuth callback → find-or-create the user, then create an app session.
 * Verifies the CSRF `state` cookie and blocks deactivated accounts.
 *
 * The find-or-create itself lives in `src/lib/auth/google-account.ts`, shared
 * with the app's native sign-in — the two differ only in how the identity was
 * proven, never in what an identity entitles you to.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?oauth=${reason}`, req.url));

  if (!isGoogleConfigured()) return fail("unavailable");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const stored = jar.get("g_oauth_state")?.value;
  jar.delete("g_oauth_state");

  if (url.searchParams.get("error") || !code || !state || !stored || !safeEqual(state, stored)) {
    return fail("failed");
  }

  const token = await exchangeGoogleCode(code);
  if (!token) return fail("failed");
  const profile = await fetchGoogleProfile(token);
  if (!profile) return fail("failed");

  // Google almost never returns a number (the scope is sensitive and not
  // requested), so `profile.phone` is normally null and the account is created
  // without one. AppShell then prompts for it on the first authed page.
  const linked = await linkOrCreateGoogleAccount({
    sub: profile.sub,
    email: profile.email,
    emailVerified: profile.emailVerified,
    name: profile.name,
    picture: profile.picture ?? null,
    phone: profile.phone,
  });
  if (!linked.ok) return fail(linked.reason);

  await createSession(linked.userId);
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
