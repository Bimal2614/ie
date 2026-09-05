"use server";

import { requireUser } from "@/lib/dal";
import { scoreAttemptWritingFor } from "@/lib/scoring/score-attempt";
import { tryConsumeAi } from "@/lib/security/rate-guard";
import { checkAiScoring } from "@/lib/security/plan-guard";

/**
 * Retry Writing scoring for one attempt.
 *
 * Mirrors scoreAttemptSpeaking: the authoritative run is the background one at
 * submit (scheduleAttemptScoring), and this is the ask-again path for when that
 * couldn't finish. Idempotent — the scorer only touches rows with no band, so
 * calling it twice cannot double-charge the API.
 */
export async function scoreAttemptWriting(
  attemptId: string,
): Promise<{ scored: number; limited?: boolean; message?: string }> {
  const user = await requireUser();

  // Plan before rate limit: a tier that never had AI scoring should be told so,
  // not handed a throttle message about an allowance it does not have.
  const gate = checkAiScoring(user);
  if (gate) return { scored: 0, limited: true, message: gate.message };

  const budget = await tryConsumeAi(user.id);
  if (!budget.allowed) return { scored: 0, limited: true, message: budget.message };

  const { scored } = await scoreAttemptWritingFor(user.id, attemptId);
  return { scored };
}
