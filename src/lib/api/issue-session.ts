import "server-only";

import { createSessionToken, validateSessionToken, type SessionClient } from "@/lib/session";
import { toAuthResponse, type AuthResponseDto } from "@/lib/api/dto";
import { unauthenticated } from "@/lib/api/errors";

/**
 * Mint a bearer session and build the response every sign-in path returns.
 *
 * The profile is read back through `validateSessionToken` — the SAME query that
 * will authenticate the app's next request — rather than assembled from
 * whatever the caller happened to have loaded. It costs one indexed round trip
 * and buys a guarantee worth far more: the `user` and `entitlements` in a login
 * response can never disagree with what the very next call sees. Building the
 * DTO from the login path's own row is how an app ends up showing Premium on
 * the home screen and being refused at every gate.
 */
export async function issueSession(
  userId: string,
  client: SessionClient,
): Promise<AuthResponseDto> {
  const issued = await createSessionToken(userId, client);
  const user = await validateSessionToken(issued.token);

  // Unreachable in practice — the row was just written in the same transaction.
  // Reachable in exactly one case worth handling: the account was deactivated
  // between authenticating and here, and a token that its own validator refuses
  // must never be handed out.
  if (!user) throw unauthenticated("That account is not available.");

  return toAuthResponse(issued, user);
}
