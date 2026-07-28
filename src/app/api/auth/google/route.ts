import { NextResponse } from "next/server";
import { isGoogleConfigured } from "@/lib/env";
import { googleAuthUrl } from "@/lib/oauth/google";
import { generateToken } from "@/lib/security/tokens";

/**
 * Start Google sign-in: mint a CSRF `state`, stash it in a short-lived cookie,
 * and redirect to Google's consent screen.
 */
export async function GET(req: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/login?oauth=unavailable", req.url));
  }

  const state = generateToken(16);
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // survives the top-level redirect back from Google
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return res;
}
