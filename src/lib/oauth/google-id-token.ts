import "server-only";

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { googleAudiences } from "@/lib/env";
import type { VerifiedGoogleIdentity } from "@/lib/auth/google-account";

/**
 * Verify a Google `id_token` produced by the NATIVE sign-in SDK.
 *
 * The website's flow never needs this: it redirects to Google, receives a
 * single-use `code` on a URL only we registered, and swaps it server-to-server
 * for a profile — the round trip is the proof. The app has no redirect to lean
 * on. It gets a signed JWT from the platform SDK and posts it to us, so the
 * proof has to be the signature, and checking it properly means checking all
 * four of these:
 *
 *   1. SIGNATURE, against Google's published keys (fetched and cached below).
 *   2. ISSUER — `accounts.google.com` or `https://accounts.google.com`. Google
 *      really does use both spellings, and accepting only one rejects real
 *      tokens depending on which SDK minted them.
 *   3. AUDIENCE, against OUR client ids. This is the check that matters most:
 *      without it, an id_token minted for ANY other Google app — one the
 *      attacker owns and can get a token from trivially — verifies perfectly
 *      and signs them in as whoever that token names.
 *   4. EXPIRY, which `jwtVerify` enforces, with a small clock tolerance so a
 *      phone whose clock drifts by a few seconds can still sign in.
 *
 * Nothing here trusts a field the token did not prove. In particular `email` is
 * only accepted when `email_verified` is true: an unverified Google address is
 * a string the account holder typed, and linking on it would let someone claim
 * a candidate's account by signing up to Google with their address.
 */

/**
 * Google's JWKS, fetched once and cached by `jose` (it honours the endpoint's
 * cache headers and re-fetches on an unknown `kid`, which is exactly what key
 * rotation looks like). Created at module scope so the cache survives across
 * requests instead of refetching on every sign-in.
 */
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"), {
  // Don't let a slow JWKS fetch hold a sign-in open indefinitely.
  timeoutDuration: 5_000,
});

const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

export type GoogleIdTokenResult =
  | { ok: true; identity: VerifiedGoogleIdentity }
  | { ok: false; reason: "not_configured" | "invalid_token" | "email_unverified" };

/** The claims we read, beyond the registered ones `jwtVerify` handles. */
type GoogleIdTokenClaims = JWTPayload & {
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  picture?: string;
};

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdTokenResult> {
  const audiences = googleAudiences();
  if (audiences.length === 0) return { ok: false, reason: "not_configured" };

  let claims: GoogleIdTokenClaims;
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: audiences,
      // A handset with a slightly wrong clock is common; a five-minute window
      // is Google's own documented tolerance and far short of the token's life.
      clockTolerance: "5m",
    });
    claims = payload as GoogleIdTokenClaims;
  } catch {
    // Signature, issuer, audience and expiry failures are deliberately one
    // answer. Telling a caller WHICH check failed tells an attacker how far
    // they got, and none of the distinctions help a legitimate app.
    return { ok: false, reason: "invalid_token" };
  }

  const sub = claims.sub;
  const email = typeof claims.email === "string" ? claims.email.trim() : "";
  if (!sub || !email) return { ok: false, reason: "invalid_token" };

  // Google sends this as a real boolean in an id_token, but as the STRING
  // "true" from the userinfo endpoint — accept both rather than silently
  // treating a verified address as unverified.
  const emailVerified = claims.email_verified === true || claims.email_verified === "true";
  if (!emailVerified) return { ok: false, reason: "email_unverified" };

  return {
    ok: true,
    identity: {
      sub,
      email,
      emailVerified: true,
      // Some Google accounts carry no display name at all; the local part of the
      // address is a better placeholder than an empty string on a profile screen.
      name: claims.name?.trim() || claims.given_name?.trim() || email.split("@")[0],
      picture: claims.picture ?? null,
      // The native SDK never returns a phone number — the scope is sensitive
      // and not requested. The app prompts for one after sign-in.
      phone: null,
    },
  };
}
