import { forgotPasswordSchema } from "@/lib/validation";
import { getRequestContext } from "@/lib/session";
import { apiRoute, readJson } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { rateLimited } from "@/lib/api/errors";
import { startPasswordReset } from "@/lib/auth/recovery-core";

/**
 * POST /api/v1/auth/forgot-password — email a reset link.
 *
 * ALWAYS 200 WITH `{ sent: true }` when it was allowed to run, whether or not
 * the address belongs to an account. A 404 here would be a free membership
 * oracle over every email address anyone cares to try, so the app shows the
 * same "check your inbox" screen either way — and must not try to be more
 * helpful than that.
 *
 * The one thing it does report is the throttle (5 per IP per hour), because an
 * app that is being rate limited needs to back off rather than retry.
 *
 * The link points at the WEBSITE's /reset-password. The app claims that URL as
 * a universal/app link and handles it itself; a candidate without the app
 * installed still completes the reset in a browser, which is why the mail does
 * not carry a custom scheme.
 */
export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req) => {
  const body = await readJson(req, forgotPasswordSchema);
  const { ip } = await getRequestContext();

  const result = await startPasswordReset(body.email, ip);
  if (!result.ok) {
    throw rateLimited(60 * 60, "Too many reset requests. Please try again later.");
  }

  return ok({ sent: true });
});
