import { requireApiUser } from "@/lib/api/auth";
import { apiRoute, readJson } from "@/lib/api/handler";
import { toEntitlementsDto, toUserDto } from "@/lib/api/dto";
import { ok } from "@/lib/api/respond";
import { planUsage } from "@/lib/security/plan-guard";
import { updateProfileFor } from "@/app/actions/settings";
import { profileSchema } from "@/lib/validation";
import { invalid } from "@/lib/api/errors";

/**
 * GET /api/v1/me — the profile, the plan, and what is left of the allowance.
 *
 * `usage` is here rather than on a screen of its own because the app needs it
 * everywhere a paywall might appear: the practice tab draws "18 of 50 answers
 * left this month" from exactly the same numbers the server will gate on. The
 * client never computes a remaining quota — it renders one.
 *
 * PATCH updates the editable half of the profile.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(req);

  return ok({
    user: toUserDto(user),
    entitlements: toEntitlementsDto(user.plan),
    usage: await planUsage(user),
  });
});

export const PATCH = apiRoute(async (req) => {
  const user = await requireApiUser(req);
  const body = await readJson(req, profileSchema);

  const result = await updateProfileFor(user.id, body);
  if (!result.ok) throw invalid(result.message, result.fields);

  return ok({
    user: toUserDto(result.user),
    entitlements: toEntitlementsDto(result.user.plan),
  });
});
