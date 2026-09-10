"use server";

import { requireUser } from "@/lib/dal";
import { scoreAttemptSpeakingFor } from "@/lib/scoring/score-attempt";
import { tryConsumeAi } from "@/lib/security/rate-guard";
import { checkAiScoring } from "@/lib/security/plan-guard";

/**
 * Speaking, server-side.
 *
 * STORING A RECORDING IS NOT HERE. It lives in the route handler at
 * /api/practice/recording, and it moved for one reason: transcoding needs
 * ffmpeg-static, a server action is bundled into every route that renders a
 * component importing it, and its 80 MB binary therefore had to be traced into
 * all four practice players. A cold start on a function that size was measured
 * at 15.9 seconds on a plain navigation into a READING task, which has no audio
 * to convert. Anything in this file that grows an ffmpeg dependency belongs in
 * that route instead.
 */

/**
 * Retry scoring for one attempt.
 *
 * The authoritative run happens in the background at submit (see
 * scheduleAttemptScoring). This exists for the case that run couldn't finish —
 * a throttle, an outage, or a batch that outlived the route's duration — so a
 * candidate looking at an unscored answer has a way to ask again. It is safe to
 * call repeatedly: the underlying scorer only touches rows with no band.
 */
export async function scoreAttemptSpeaking(
  attemptId: string,
): Promise<{ scored: number; limited?: boolean; message?: string }> {
  const user = await requireUser();

  const gate = checkAiScoring(user);
  if (gate) return { scored: 0, limited: true, message: gate.message };

  const budget = await tryConsumeAi(user.id);
  if (!budget.allowed) return { scored: 0, limited: true, message: budget.message };

  const { scored } = await scoreAttemptSpeakingFor(user.id, attemptId);
  return { scored };
}
