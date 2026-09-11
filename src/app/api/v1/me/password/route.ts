import { requireApiUser } from "@/lib/api/auth";
import { apiRoute, readJson } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { conflict, invalid } from "@/lib/api/errors";
import { passwordChangeSchema } from "@/lib/validation";
import { changePasswordFor } from "@/app/actions/settings";

/**
 * POST /api/v1/me/password — change the password, current one first.
 *
 * The session SURVIVES the change, on this client and on the others. That is a
 * deliberate choice and worth stating: a password change here is authenticated
 * by a live session plus the old password, so it is not the account-recovery
 * path and revoking everything would mostly punish the owner. The reset flow —
 * which proves control of the mailbox instead — is the one that clears
 * sessions, because that is the one an attacker would use.
 */
export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req) => {
  const user = await requireApiUser(req);
  const body = await readJson(req, passwordChangeSchema);

  const result = await changePasswordFor(user.id, user.email, body);
  if (!result.ok) {
    // A Google-only account has nothing to change, however well-formed the
    // request was — that is a state conflict, not bad input.
    if (!result.fields) throw conflict(result.message);
    throw invalid(result.message, result.fields);
  }

  return ok({ changed: true });
});
