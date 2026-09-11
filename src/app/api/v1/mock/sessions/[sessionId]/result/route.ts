import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { notFound } from "@/lib/api/errors";
import { getMockResult, mockScoringStatus } from "@/app/actions/mock";

/**
 * GET /api/v1/mock/sessions/{id}/result — the report for a handed-in paper.
 *
 * Carries `pending` alongside the bands, so ONE request answers both "what did
 * I get" and "is anything still being marked". Splitting those would have the
 * app poll a status endpoint and then fetch the result again, doubling the
 * round trips on the screen a candidate stares at hardest.
 *
 * A band of `null` on Writing or Speaking with `pending > 0` means "still being
 * marked"; the same `null` with `pending === 0` means it could not be marked at
 * all. The app must say different things for those, which is why the count is
 * here rather than being inferred from the nulls.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req, ctx: { params: Promise<{ sessionId: string }> }) => {
  await requireApiCandidate(req);
  const { sessionId } = await ctx.params;

  // Both are owner-scoped reads of the same sitting, and neither depends on the
  // other, so they go together rather than one after the next.
  const [result, status] = await Promise.all([
    getMockResult(sessionId),
    mockScoringStatus(sessionId),
  ]);

  if (!result) throw notFound("No result for that sitting.");

  return ok({
    ...result,
    pending: status.pending,
    /** What to wait before asking again. Absent once nothing is outstanding. */
    retryAfterSec: status.pending > 0 ? 5 : undefined,
  });
});
