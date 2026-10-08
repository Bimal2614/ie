import { NextResponse } from "next/server";
import { clearedInviteCookie, INVITE_COOKIE, inviteCookieOptions, isInviteToken } from "@/lib/partner-invites";

/**
 * The link in a partner's invitation email.
 *
 * Moves the token into a cookie and sends the browser to a clean `/invite`, so
 * the token never sits in an address bar a page script can read (see
 * INVITE_COOKIE). Touches no database row: a mail scanner fetching this link
 * redeems nothing.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = NextResponse.redirect(new URL("/invite", req.url));
  res.headers.set("Cache-Control", "no-store");
  // A mangled link must not fall back on an older invite still in the jar.
  if (isInviteToken(token)) res.cookies.set(INVITE_COOKIE, token, inviteCookieOptions);
  else res.cookies.set(INVITE_COOKIE, "", clearedInviteCookie);
  return res;
}
