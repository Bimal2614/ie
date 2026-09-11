import { signupSchema } from "@/lib/validation";
import { registerAccount } from "@/lib/auth/core";
import { getRequestContext } from "@/lib/session";
import { apiRoute, readJson } from "@/lib/api/handler";
import { clientFrom } from "@/lib/api/auth";
import { issueSession } from "@/lib/api/issue-session";
import { authFailureToApiError } from "@/lib/api/auth-errors";
import { created } from "@/lib/api/respond";

/**
 * POST /api/v1/auth/signup — create an account and sign straight in.
 *
 * Same schema as the website's form, so the app gets the same validation
 * messages for the same inputs — including the phone rules, which are
 * libphonenumber-backed and reject far more than a length check would. The app
 * should render `error.fields` against its own inputs rather than reimplementing
 * any of it.
 *
 * 201, with the session: a candidate who has just typed their details should be
 * inside the app, not back at a login form retyping them.
 */
export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req) => {
  const body = await readJson(req, signupSchema);
  const origin = await getRequestContext();

  const result = await registerAccount(body, origin);
  if (!result.ok) throw authFailureToApiError(result);

  return created(await issueSession(result.userId, clientFrom(req)));
});
