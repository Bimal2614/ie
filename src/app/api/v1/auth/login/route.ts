import { loginSchema } from "@/lib/validation";
import { authenticate } from "@/lib/auth/core";
import { getRequestContext } from "@/lib/session";
import { apiRoute, readJson } from "@/lib/api/handler";
import { clientFrom } from "@/lib/api/auth";
import { issueSession } from "@/lib/api/issue-session";
import { authFailureToApiError } from "@/lib/api/auth-errors";
import { ok } from "@/lib/api/respond";

/**
 * POST /api/v1/auth/login — email + password, in exchange for a bearer token.
 *
 * The policy (throttling, the lockout ladder, the constant-time
 * anti-enumeration path) is `authenticate()` in src/lib/auth/core.ts, shared
 * with the website's sign-in form. This route only translates its result into
 * HTTP, which is the whole point of the split: the app and the website cannot
 * end up with different lockout rules because there is one implementation.
 */
export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req) => {
  const body = await readJson(req, loginSchema);
  const origin = await getRequestContext();

  const result = await authenticate(body.email, body.password, origin);
  if (!result.ok) throw authFailureToApiError(result);

  return ok(await issueSession(result.userId, clientFrom(req)));
});
