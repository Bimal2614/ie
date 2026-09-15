import { NextResponse } from "next/server";
import { isGoogleConfigured } from "@/lib/env";
import { googleAuthUrl } from "@/lib/oauth/google";
import { isReferralId, REF_ID, REFERRAL_COOKIE } from "@/lib/partner-referral";
import { generateToken } from "@/lib/security/tokens";

/**
 * Start Google sign-in: mint a CSRF `state`, stash it in a short-lived cookie,
 * and redirect to Google's consent screen.
 *
 * A `?ref=` from a class's invite link rides along in a second cookie of the
 * same shape and lifetime. IT CANNOT TRAVEL ANY OTHER WAY: Google returns the
 * browser to a fixed redirect URI carrying its own parameters, so anything of
 * ours not parked here is gone by the time the account is created. Only the
 * id — the name on the link is display-only and never leaves the signup page.
 */
export async function GET(req: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/login?oauth=unavailable", req.url));
  }

  const state = generateToken(16);
  const res = NextResponse.redirect(googleAuthUrl(state));
  const cookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, // survives the top-level redirect back from Google
    path: "/",
    maxAge: 600, // 10 minutes
  };
  res.cookies.set("g_oauth_state", state, cookie);

  const ref = new URL(req.url).searchParams.get(REF_ID);
  if (isReferralId(ref)) {
    res.cookies.set(REFERRAL_COOKIE, ref, cookie);
  } else {
    // A signup started from an ordinary /signup must not inherit whatever class
    // an earlier, abandoned one left in the jar.
    res.cookies.delete(REFERRAL_COOKIE);
  }

  return res;
}
