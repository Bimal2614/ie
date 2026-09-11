import { requireApiUser } from "@/lib/api/auth";
import { apiRoute } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { notFound } from "@/lib/api/errors";
import { getAttemptDetailFor } from "@/app/actions/history";

/**
 * GET /api/v1/attempts/{attemptId} — one attempt in full.
 *
 * The review screen: every question, what the candidate answered, the right
 * answer, the explanation, and the band with its AI feedback where there is
 * one. The passage or recording comes with it, because reviewing a reading
 * answer without the passage is not reviewing anything.
 *
 * Scoped to the caller inside `getAttemptDetailFor`, so another candidate's
 * attempt is indistinguishable from one that does not exist.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req, ctx: { params: Promise<{ attemptId: string }> }) => {
  const user = await requireApiUser(req);
  const { attemptId } = await ctx.params;

  const detail = await getAttemptDetailFor(user.id, attemptId);
  if (!detail) throw notFound("No such attempt.");

  return ok(detail);
});
