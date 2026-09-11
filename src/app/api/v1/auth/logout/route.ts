import { bearerToken, apiUser } from "@/lib/api/auth";
import { destroySessionToken, getRequestContext } from "@/lib/session";
import { audit } from "@/lib/auth/core";
import { apiRoute } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";

/**
 * POST /api/v1/auth/logout — revoke the calling session.
 *
 * Always answers 200, even with a missing, expired or already-revoked token.
 * Logging out is the one operation that must never fail: an app that cannot
 * complete it is an app holding a token it has decided to stop using but cannot
 * get rid of. It also keeps this from being an oracle — a 401 here would
 * confirm which tokens are live.
 *
 * Only THIS session dies. The candidate's browser keeps its own, which is the
 * point of scoping sessions per client (see `createSessionToken`): signing out
 * of the phone should not sign them out of the essay they are mid-way through
 * on a laptop.
 */
export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req) => {
  // Resolved BEFORE revocation — afterwards there is no session left to name in
  // the audit trail.
  const user = await apiUser(req);

  await destroySessionToken(bearerToken(req));

  if (user) {
    await audit(user.id, "logout", await getRequestContext(), { client: "api" });
  }

  return ok({ signedOut: true });
});
