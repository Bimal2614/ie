import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/session";

/**
 * Clear the session cookie, then bounce to /login.
 *
 * This exists because two layers judge auth independently: proxy.ts routes on
 * cookie *presence* only (it must never touch the DB on the hot path), while
 * the DAL validates the session against the DB. When a cookie outlives its
 * session — revoked, idled out past 7 days, or "log out everywhere" — the two
 * disagree and bounce forever: /dashboard → (DAL says no) → /login → (proxy
 * sees a cookie) → /dashboard.
 *
 * The authoritative layer has to remove the cookie to settle it. A Server
 * Component cannot write cookies during render, so the DAL redirects here — a
 * Route Handler, which can.
 */
export async function GET(request: NextRequest) {
  await destroySession();

  const next = request.nextUrl.searchParams.get("next");
  const url = new URL("/login", request.url);
  // Only ever an internal path — never reflect an absolute URL into a redirect.
  if (next?.startsWith("/") && !next.startsWith("//")) {
    url.searchParams.set("next", next);
  }
  return NextResponse.redirect(url);
}
