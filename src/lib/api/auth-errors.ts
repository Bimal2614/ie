import "server-only";

import type { AuthFailure } from "@/lib/auth/core";
import { ApiError, conflict, invalid, rateLimited, unauthenticated } from "@/lib/api/errors";

/**
 * Map a failed sign-in or sign-up onto the API's error vocabulary.
 *
 * Every branch keeps the core's own message VERBATIM. The wording of
 * `invalid_credentials` is load-bearing — it is deliberately identical for "no
 * such account" and "wrong password" — so nothing here may "improve" it into
 * something that tells the two apart.
 *
 * The status choices are what the app actually branches on:
 *
 *  - `locked` and `oauth_only` are NOT 401. A 401 tells the app "those
 *    credentials were wrong, ask again", and in both of these cases asking
 *    again can never succeed: the password may be perfectly correct and simply
 *    unusable right now. They need a message and a different route out, not a
 *    re-prompt, so they come back as a conflict.
 */
export function authFailureToApiError(failure: AuthFailure): ApiError {
  switch (failure.code) {
    case "throttled":
      return rateLimited(failure.retryAfterSec ?? 60, failure.message);
    case "locked":
      return conflict(failure.message);
    case "oauth_only":
      return conflict(failure.message);
    case "email_taken":
      // Field-shaped, so the app can mark the email input rather than showing a
      // banner over a form the user then has to re-read to find the problem.
      return invalid(failure.message, { email: [failure.message] });
    case "invalid_credentials":
    default:
      return unauthenticated(failure.message);
  }
}
