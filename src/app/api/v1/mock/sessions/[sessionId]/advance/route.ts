import { z } from "zod";
import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute, readJson } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { advanceMockModule } from "@/app/actions/mock";

/**
 * POST /api/v1/mock/sessions/{id}/advance — hand in this module, open the next.
 *
 * `fromIndex` IS A CLAIM, NOT AN INSTRUCTION. It is the module the app believes
 * it is in, and the server checks it against its own clock before acting. If the
 * bell has already gone — the request was in flight, the phone was asleep, the
 * candidate was away — the roll-over IS the advance, and the module the clock is
 * actually in comes back instead. Without that check a request landing
 * milliseconds after a deadline would advance from the module AFTER the one
 * being left, skipping a whole hour of the paper.
 *
 * So the app must RENDER what comes back rather than assuming `fromIndex + 1`.
 * `lapsedIndexes` names any module the bell closed in the meantime, so the
 * candidate is told what they missed instead of silently losing it.
 *
 * Finishing early rebases the rest of the plan to start now: the wait is given
 * back, the time is not.
 */
export const dynamic = "force-dynamic";

const advanceSchema = z.object({
  /** The module the client thinks it is leaving. Verified, not trusted. */
  fromIndex: z.coerce.number().int().min(0).max(20),
  answers: z.record(z.string(), z.unknown()),
  timings: z.record(z.string(), z.number().int().min(0).max(24 * 60 * 60)),
});

export const POST = apiRoute(async (req, ctx: { params: Promise<{ sessionId: string }> }) => {
  await requireApiCandidate(req);
  const { sessionId } = await ctx.params;
  const body = await readJson(req, advanceSchema);

  const result = await advanceMockModule(
    sessionId,
    body.fromIndex,
    body.answers,
    body.timings,
  );

  /**
   * `done: true` means that was the last module and the paper is now submitted.
   * Objective sections are already marked; Writing and Speaking are queued and
   * arrive later, so the app moves to the result screen and polls
   * /api/v1/mock/sessions/{id}/score for the bands.
   */
  return ok(result);
});
