import { z } from "zod";
import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute, readJson } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { saveMockProgress } from "@/app/actions/mock";

/**
 * PUT /api/v1/mock/sessions/{id}/progress — autosave the current module.
 *
 * A DRAFT, not a submission. It writes `draft_answers`/`draft_timings` on a
 * sitting that is still `in_progress` and nothing else: it cannot advance a
 * module, cannot hand the paper in, and cannot touch a sitting that is already
 * finished or belongs to somebody else.
 *
 * WHY THE APP NEEDS THIS MORE THAN THE WEBSITE DOES. A browser tab is
 * comparatively stable; a phone gets backgrounded, loses signal in a lift and is
 * killed by the OS under memory pressure. Autosaving every ~15 seconds and after
 * each answer is the difference between resuming a paper and losing an hour of
 * it. It is idempotent, so a retry after a dropped connection is free.
 *
 * PUT, not PATCH: this REPLACES the draft with the client's current picture of
 * the module rather than merging into it. Merging would make a deleted answer
 * impossible to express.
 */
export const dynamic = "force-dynamic";

const progressSchema = z.object({
  /** Whole module's answers, keyed by question id. Shape varies per family. */
  answers: z.record(z.string(), z.unknown()),
  /** Seconds spent per question id. Pacing only — never used for grading. */
  timings: z.record(z.string(), z.number().int().min(0).max(24 * 60 * 60)),
});

export const PUT = apiRoute(async (req, ctx: { params: Promise<{ sessionId: string }> }) => {
  await requireApiCandidate(req);
  const { sessionId } = await ctx.params;
  const body = await readJson(req, progressSchema);

  await saveMockProgress(sessionId, body.answers, body.timings);

  /**
   * `savedAt` is the SERVER's time, and the app should show it as "saved at
   * 10:42" rather than stamping its own. The device clock is not authoritative
   * anywhere else in a mock sitting, and a save time that disagrees with the
   * countdown beside it is worse than no save time at all.
   */
  return ok({ sessionId, savedAt: new Date().toISOString() });
});
