import { z } from "zod";
import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute, readJson } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { notFound, planRequired } from "@/lib/api/errors";
import { gradeSectionFor } from "@/lib/section-grading";
import { isPlanBlock } from "@/lib/plans";

/**
 * POST /api/v1/practice/sections/{sectionId}/submit — mark one exam part.
 *
 * THE BAND NEVER COMES FROM THE CLIENT. This sends answers; the server marks
 * the objective items against the key stored in the section's own jsonb, and
 * queues Writing and Speaking for the AI examiner. A response that accepted a
 * score would let any candidate award themselves a 9.
 *
 * ANSWERS ARE KEYED BY EXAM NUMBER — `{"7": {...}}` — because an item inside a
 * `practice_sections` document has no uuid of its own. That is deliberately
 * NOT how /api/v1/practice/submit keys its answers (by question id) or how a
 * mock keys its own (`"<sectionId>:<sheetNumber>"`, since a bare number
 * collides four ways inside one paper). Section practice sits one part at a
 * time, so here the number IS the identity.
 *
 * Writing and Speaking come back inside `subjective`, with no band yet; the app
 * polls /api/v1/attempts/{attemptId}/score for those.
 */
export const dynamic = "force-dynamic";

/**
 * The envelope only. Answer values vary per question family — a gap fill is not
 * a multiple choice is not a recording — and are stored as-is into a jsonb
 * column, so `gradeSectionFor` holds the real guards (200 keys, 256 KB) beside
 * the code that knows the families.
 */
const submitSchema = z.object({
  answers: z.record(z.string(), z.record(z.string(), z.unknown())),
  /** Whole seconds on the part. Spread across the answers for pacing stats;
   *  never used for grading. */
  timeSpentSec: z.coerce.number().int().min(0).max(24 * 60 * 60).optional(),
});

export const POST = apiRoute(async (req, ctx: { params: Promise<{ sectionId: string }> }) => {
  const user = await requireApiCandidate(req);
  const { sectionId } = await ctx.params;
  const body = await readJson(req, submitSchema);

  let result;
  try {
    result = await gradeSectionFor(user, sectionId, body.answers, body.timeSpentSec);
  } catch (error) {
    // The shared core throws for a part that isn't there, because the website's
    // action has no other way to say so. Over HTTP that is a 404, not a 500.
    if (error instanceof Error && error.message === "Section not found") {
      throw notFound("No such practice section.");
    }
    throw error;
  }

  // The gate refuses BEFORE anything is graded or written, and it returns
  // rather than throws so the reason survives. A 402 carrying the block is what
  // drives the app's paywall — which tier is needed, how much of the allowance
  // is spent, when it resets.
  if (isPlanBlock(result)) throw planRequired(result);

  return ok(result);
});
