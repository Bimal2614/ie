import { z } from "zod";
import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute, readJson } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { planRequired } from "@/lib/api/errors";
import { submitPracticeFor } from "@/app/actions/practice";
import { isPlanBlock } from "@/lib/plans";

/**
 * POST /api/v1/practice/submit — grade a set and record the attempt.
 *
 * THE BAND NEVER COMES FROM THE CLIENT. This sends answers; the server marks
 * the objective questions against the stored key and queues Writing and
 * Speaking for AI scoring. A response that accepted a score would let any
 * candidate award themselves a 9.
 *
 * Writing and Speaking come back with `band: null` and are filled in after the
 * response is sent (see `scheduleAttemptScoring`). The app polls
 * /api/v1/attempts/{attemptId}/score for them — `subjective > 0` in this
 * response is how it knows there is anything to wait for.
 */
export const dynamic = "force-dynamic";

/**
 * Answers arrive keyed by question id, with a shape that varies per question
 * family — a gap fill is not a multiple choice is not a recording. The values
 * are stored as-is into a jsonb column, so this validates the ENVELOPE and
 * leaves the contents to `submitPracticeFor`, which knows the family and holds
 * the size guards (200 keys, 256 KB).
 */
const submitSchema = z.object({
  setId: z.string().uuid("Not a valid set id"),
  answers: z.record(z.string(), z.record(z.string(), z.unknown())),
  /** Whole seconds on the set. Used for pacing stats; never for grading. */
  timeSpentSec: z.coerce.number().int().min(0).max(24 * 60 * 60).optional(),
});

export const POST = apiRoute(async (req) => {
  const user = await requireApiCandidate(req);
  const body = await readJson(req, submitSchema);

  const result = await submitPracticeFor(user, body.setId, body.answers, body.timeSpentSec);

  // The gate refuses BEFORE anything is graded or written, and it returns
  // rather than throws so the reason survives. A 402 carrying the block is what
  // drives the app's paywall — which tier is needed, how much of the allowance
  // is spent, when it resets.
  if (isPlanBlock(result)) throw planRequired(result);

  return ok(result);
});
