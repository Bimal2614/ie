import { bearerToken, requireApiUser } from "@/lib/api/auth";
import { touchSessionToken } from "@/lib/session";
import { apiRoute } from "@/lib/api/handler";
import { toEntitlementsDto, toUserDto } from "@/lib/api/dto";
import { ok } from "@/lib/api/respond";

/**
 * GET /api/v1/auth/session — is this token still good, and what does it buy?
 *
 * What the app calls on cold start and on resume from background. It answers
 * the two questions a freshly-woken app has, in one round trip:
 *
 *  - is the stored token still valid (401 → clear the keychain, show sign-in);
 *  - has anything changed while we were away — a plan bought on the website, a
 *    subscription that lapsed overnight, a profile edited elsewhere.
 *
 * It also SLIDES THE IDLE WINDOW, which is what stops a candidate who opens the
 * app every few days from being signed out by a 7-day idle timeout they never
 * actually hit. No new token is minted: the one in the keychain stays valid and
 * simply lives longer, so there is nothing for the app to store.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(req);

  // Best-effort and deliberately unawaited-on-failure inside the helper: a
  // write failing here must not turn a valid session into a 500.
  await touchSessionToken(bearerToken(req));

  return ok({
    user: toUserDto(user),
    entitlements: toEntitlementsDto(user.plan),
  });
});
