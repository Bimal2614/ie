import "server-only";

import { after } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { userResponses } from "@/db/schema";
import { guardAi, RateLimitError } from "@/lib/security/rate-guard";
import { userMayUseAiScoring } from "@/lib/security/plan-guard";
import { scoreAttemptSpeakingFor, scoreAttemptWritingFor } from "./score-attempt";

/**
 * Kick off AI band scoring for an attempt AFTER the response has been sent.
 *
 * WHY `after()` AND NOT THE BROWSER. Scoring used to be fired from the client
 * once submit returned. That meant a candidate who closed the tab — or lost
 * signal, or hit a flaky network on the way back — had their answers saved and
 * silently never scored, with the UI already telling them a band was coming.
 * `after()` runs the work in the same server request, once the response is out:
 * the submit still returns immediately, and the scoring no longer depends on a
 * browser staying alive to ask for it.
 *
 * WHY IT CAN'T JUST RUN INLINE. A speaking call is ~15s (a full long turn ~40s)
 * and a writing grade a few seconds; a seven-question Part 1 would hold the submit
 * open for minutes.
 * Rows land with band=null and the UI renders "awaiting score" until this fills
 * them in.
 *
 * DURATION CAVEAT: `after()` is bounded by the route's max duration, so a very
 * large batch can still be cut off mid-way. Both scorers are idempotent, so
 * whatever didn't finish is simply picked up by the next run — this is exactly
 * why the retry path has to stay.
 */

/** Only these two are AI-scored; the rest are keyed and graded at submit. */
const AI_SECTIONS = ["writing", "speaking"] as const;

export function scheduleAttemptScoring(userId: string, attemptId: string): void {
  after(async () => {
    try {
      // Cheap indexed pre-check. The rate guard must not be spent on an attempt
      // with nothing subjective in it — a reading paper would otherwise burn a
      // day's AI quota submitting passages.
      const pending = await db
        .select({ section: userResponses.section })
        .from(userResponses)
        .where(
          and(
            eq(userResponses.attemptId, attemptId),
            eq(userResponses.userId, userId),
            isNull(userResponses.band),
            inArray(userResponses.section, [...AI_SECTIONS]),
          ),
        );
      if (pending.length === 0) return;

      // The last check before money is spent. The submit that scheduled this
      // was already gated, but this callback outlives its request: a plan can
      // lapse in between, and a row written while entitled must not pull a
      // scoring call afterwards. Reads the tier from the row, since there is no
      // session here. Rows stay band-less, exactly as an outage leaves them.
      if (!(await userMayUseAiScoring(userId))) return;

      const sections = new Set(pending.map((p) => p.section));
      await guardAi(userId);

      // Sequential, not parallel: they share one per-account AI budget, and a
      // writing grade finishing first is worth more than both landing together.
      if (sections.has("writing")) await scoreAttemptWritingFor(userId, attemptId);
      if (sections.has("speaking")) await scoreAttemptSpeakingFor(userId, attemptId);
    } catch (e) {
      // A throttle or an outage must never surface as a failed submit — the
      // answers are already saved, and the retry path re-runs this.
      if (e instanceof RateLimitError) return;
      console.error("[scoring] background run failed", { attemptId, error: e });
    }
  });
}
