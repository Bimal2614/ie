"use server";

import { requireUser } from "@/lib/dal";
import { scoreAttemptWritingFor } from "@/lib/scoring/score-attempt";
import { guardAi, RateLimitError } from "@/lib/security/rate-guard";

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

  try {
    await guardAi(user.id);
  } catch (e) {
    if (e instanceof RateLimitError) return { scored: 0, limited: true, message: e.message };
    throw e;
  }

  const { scored } = await scoreAttemptWritingFor(user.id, attemptId);
  return { scored };
}
