import { resetPasswordSchema } from "@/lib/validation";
import { apiRoute, readJson } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { conflict } from "@/lib/api/errors";
import { completePasswordReset } from "@/lib/auth/recovery-core";

/**
 * POST /api/v1/auth/reset-password — set a new password from an emailed token.
 *
 * SIGNS THE CANDIDATE OUT EVERYWHERE, including on the handset making this
 * call. That is deliberate and the opposite of /api/v1/me/password, which keeps
 * every session: a reset proves control of the mailbox and is the path an
 * attacker would take, so it clears everything; a change is already
 * authenticated by a live session plus the old password, and revoking there
 * would mostly punish the owner.
 *
 * So the app must CLEAR ITS KEYCHAIN on success and route to sign-in. It is
 * told so explicitly by `signedOutEverywhere` rather than being left to infer
 * it from the next request's 401 — which would otherwise arrive mid-screen,
 * looking like a bug.
 *
 * A spent, expired or forged token is a `conflict`, not a validation failure:
 * the request was well-formed and there is nothing for the candidate to correct
 * in it. The app sends them back to "forgot password" rather than highlighting
 * a field they never typed.
 */
export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req) => {
  const body = await readJson(req, resetPasswordSchema);

  const result = await completePasswordReset(body.token, body.newPassword);
  if (!result.ok) {
    throw conflict("This reset link is invalid or has expired. Please request a new one.");
  }

  return ok({ reset: true, signedOutEverywhere: true });
});
