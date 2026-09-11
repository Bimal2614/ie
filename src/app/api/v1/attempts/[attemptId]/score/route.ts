import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { userResponses } from "@/db/schema";
import { requireApiUser } from "@/lib/api/auth";
import { apiRoute } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { notFound } from "@/lib/api/errors";
import { isSpeakingAiConfigured, isWritingAiConfigured } from "@/lib/env";
import { scheduleAttemptScoring } from "@/lib/scoring/background";

/**
 * GET /api/v1/attempts/{attemptId}/score — has the AI finished marking?
 *
 * THE ENDPOINT THE APP NEEDS AND THE WEBSITE DOES NOT. On the web, scoring runs
 * in `after()` and the finished band arrives with the next render of a page
 * that was going to be revalidated anyway. An app has no such render: it gets a
 * submit response with `band: null` and must find out for itself when that
 * changes. So it polls this.
 *
 * WHAT IT IS NOT: a trigger. Scoring was already queued by the submit, so this
 * only REPORTS. Re-queueing whatever is still unscored is the POST below, and
 * it is a separate verb precisely so that polling can never spend AI budget.
 *
 * SUGGESTED POLLING, and the response carries `retryAfterSec` so the app does
 * not hard-code it: a writing grade takes a few seconds, a speaking call
 * ~15s and a full long turn ~40s. Every 3s for the first half-minute, then
 * every 10s, and stop at two minutes with whatever has arrived.
 */
export const dynamic = "force-dynamic";

/** Only these two are AI-scored; everything else is keyed and graded at submit. */
const AI_SECTIONS = new Set(["writing", "speaking"]);

export const GET = apiRoute(async (req, ctx: { params: Promise<{ attemptId: string }> }) => {
  const user = await requireApiUser(req);
  const { attemptId } = await ctx.params;

  /**
   * Scoped to the caller, which IS the ownership check. Somebody else's attempt
   * returns no rows and therefore 404 — never 403, which would confirm that the
   * id is real and turn this into an oracle over every attempt in the database.
   */
  const rows = await db
    .select({
      id: userResponses.id,
      section: userResponses.section,
      questionType: userResponses.questionType,
      band: userResponses.band,
      aiFeedback: userResponses.aiFeedback,
      isCorrect: userResponses.isCorrect,
    })
    .from(userResponses)
    .where(and(eq(userResponses.attemptId, attemptId), eq(userResponses.userId, user.id)));

  if (rows.length === 0) throw notFound("No such attempt.");

  const subjective = rows.filter((r) => AI_SECTIONS.has(r.section));
  const pending = subjective.filter((r) => r.band === null);

  /**
   * Whether this deployment can score at all.
   *
   * A missing API key looks EXACTLY like a slow one — rows stay unscored — so
   * an app without this would poll the full schedule and then offer a retry
   * that cannot possibly succeed, leaving the candidate believing their answer
   * failed when it was never gradeable. Booleans only: never the key, the model
   * or the endpoint.
   */
  const scorers = { writing: isWritingAiConfigured(), speaking: isSpeakingAiConfigured() };
  const unscorable = pending.filter((r) =>
    r.section === "writing" ? !scorers.writing : !scorers.speaking,
  );

  const status = resolveStatus(subjective.length, pending.length, unscorable.length);

  return ok({
    attemptId,
    status,
    /** Nothing subjective in this attempt — the app can skip polling entirely. */
    aiScored: subjective.length > 0,
    pending: pending.length,
    total: subjective.length,
    scorers,
    /** What to wait before asking again. Absent once there is nothing to wait for. */
    retryAfterSec: status === "pending" ? 3 : undefined,
    results: rows.map((r) => ({
      responseId: r.id,
      section: r.section,
      questionType: r.questionType,
      band: r.band,
      isCorrect: r.isCorrect,
      feedback: r.aiFeedback,
    })),
  });
});

/**
 * POST /api/v1/attempts/{attemptId}/score — ask again for anything unscored.
 *
 * `after()` is bounded by the route's max duration, so a large batch can be cut
 * off part-way through. Both scorers are idempotent and skip rows that already
 * carry a band, which is what makes a retry safe — and is exactly why the retry
 * path has to exist at all rather than the app being told to resubmit.
 */
export const POST = apiRoute(async (req, ctx: { params: Promise<{ attemptId: string }> }) => {
  const user = await requireApiUser(req);
  const { attemptId } = await ctx.params;

  const rows = await db
    .select({ id: userResponses.id, band: userResponses.band, section: userResponses.section })
    .from(userResponses)
    .where(and(eq(userResponses.attemptId, attemptId), eq(userResponses.userId, user.id)));

  if (rows.length === 0) throw notFound("No such attempt.");

  const pending = rows.filter((r) => AI_SECTIONS.has(r.section) && r.band === null);

  // Nothing to do. Deliberately a success, not a conflict: an app that retried
  // once too often has got the outcome it wanted, and an error here would send
  // it into a retry loop over an attempt that is already fully marked.
  if (pending.length === 0) {
    return ok({ attemptId, requeued: false, pending: 0 });
  }

  // The guards live inside — plan entitlement and the AI budget are both
  // checked there, so a retry cannot be used to spend quota this account does
  // not have.
  scheduleAttemptScoring(user.id, attemptId);

  return ok({ attemptId, requeued: true, pending: pending.length, retryAfterSec: 3 });
});

type ScoreStatus = "not_applicable" | "pending" | "scored" | "unavailable";

function resolveStatus(total: number, pending: number, unscorable: number): ScoreStatus {
  if (total === 0) return "not_applicable";
  if (pending === 0) return "scored";
  // Every outstanding row needs a scorer this deployment has not got. Waiting
  // will never resolve it, and the app should say so rather than spin.
  if (unscorable === pending) return "unavailable";
  return "pending";
}
