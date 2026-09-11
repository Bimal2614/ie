import { z } from "zod";
import { getRequestContext } from "@/lib/session";
import { verifyGoogleIdToken } from "@/lib/oauth/google-id-token";
import { linkOrCreateGoogleAccount } from "@/lib/auth/google-account";
import { audit } from "@/lib/auth/core";
import { rateLimit } from "@/lib/security/rate-limit";
import { apiRoute, readJson } from "@/lib/api/handler";
import { clientFrom } from "@/lib/api/auth";
import { issueSession } from "@/lib/api/issue-session";
import { ok } from "@/lib/api/respond";
import { conflict, rateLimited, unauthenticated, unavailable } from "@/lib/api/errors";

/**
 * POST /api/v1/auth/google — native Google Sign-In.
 *
 * The app runs Google's own SDK, which returns a signed `id_token`, and posts
 * it here. There is no redirect, no `state` cookie and no code exchange: the
 * signature IS the proof, so everything rests on verifying it properly — see
 * src/lib/oauth/google-id-token.ts for what "properly" means and why the
 * audience check is the one that matters.
 *
 * Once verified, the account handling is byte-for-byte what the website's
 * callback does, because it is literally the same function.
 */
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  /** The `idToken` from `google_sign_in`. Not the access token — they differ. */
  idToken: z.string().min(1, "Missing Google id token").max(8192),
});

export const POST = apiRoute(async (req) => {
  const { idToken } = await readJson(req, bodySchema);
  const origin = await getRequestContext();

  /**
   * Throttled per network like every other sign-in door.
   *
   * Verification is cheap once the JWKS is cached, but this endpoint is an
   * unauthenticated one that does a database write on success, and leaving it
   * as the only unthrottled way in would make it the way in.
   */
  const limit = await rateLimit(`login:google:ip:${origin.ip ?? "unknown"}`, 30, 15 * 60);
  if (!limit.allowed) {
    throw rateLimited(limit.retryAfterSec, "Too many attempts. Please try again shortly.");
  }

  const verified = await verifyGoogleIdToken(idToken);
  if (!verified.ok) {
    switch (verified.reason) {
      case "not_configured":
        // Our misconfiguration, not the caller's. 503 so the app can say "try
        // another way" rather than telling the user their Google account failed.
        throw unavailable("Google sign-in isn't available right now.");
      case "email_unverified":
        throw conflict(
          "That Google account has no verified email address. Verify it with Google, then try again.",
        );
      default:
        await audit(null, "login.google.invalid_token", origin);
        throw unauthenticated("That Google sign-in could not be verified. Please try again.");
    }
  }

  const linked = await linkOrCreateGoogleAccount(verified.identity);
  if (!linked.ok) {
    await audit(null, "login.google.blocked.deactivated", origin, {
      email: verified.identity.email,
    });
    throw conflict("This account has been deactivated. Please contact support.");
  }

  await audit(linked.userId, "login.google.success", origin);
  return ok(await issueSession(linked.userId, clientFrom(req)));
});
