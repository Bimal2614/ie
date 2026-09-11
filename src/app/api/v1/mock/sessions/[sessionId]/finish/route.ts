import { z } from "zod";
import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute, readJson } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { finishMock } from "@/app/actions/mock";

/**
 * POST /api/v1/mock/sessions/{id}/finish — hand the whole paper in.
 *
 * The early exit: the candidate stops before the last module rather than
 * advancing through it. `advance` on the final module does the same thing, so
 * both paths land in `submitSitting` and there is one place a paper is marked.
 *
 * IDEMPOTENT, which matters on a phone. `submitSitting` scopes its write to a
 * sitting that is still `in_progress` and its result insert does nothing on
 * conflict, so a retry after a dropped connection cannot double-mark a paper or
 * overwrite a finished one with a stale draft.
 *
 * Objective sections are marked here and now. Writing and Speaking are queued
 * and filled in afterwards — poll ./score for those.
 */
export const dynamic = "force-dynamic";

/**
 * Room for marking a full paper: four modules of objective answers graded
 * against their keys, in one statement, before the response goes out.
 */
export const maxDuration = 60;

const finishSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  timings: z.record(z.string(), z.number().int().min(0).max(24 * 60 * 60)).default({}),
});

export const POST = apiRoute(async (req, ctx: { params: Promise<{ sessionId: string }> }) => {
  await requireApiCandidate(req);
  const { sessionId } = await ctx.params;
  const body = await readJson(req, finishSchema);

  await finishMock(sessionId, body.answers as Record<string, never>, body.timings);

  return ok({ sessionId, submitted: true });
});
