import "server-only";

import { and, eq, gt, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { mockTestAnswers, userResponses } from "@/db/schema";

/**
 * ONE DEFINITION OF "STILL BEING SCORED", for everything that needs to agree
 * about it.
 *
 * Four things ask this question and they must give the same answer:
 *
 *  - the sweeper cron (/api/cron/scoring), deciding what to pick up;
 *  - `mockScoringStatus`, which the report polls to know whether to keep
 *    waiting;
 *  - `scoreMockSpeakingFor`/`scoreMockWritingFor`, deciding whether a module
 *    band may be published yet;
 *  - and, by implication, the candidate, who is told "still marking".
 *
 * They had three copies of the predicate between them. A drift in any one is not
 * a cosmetic bug: a report that polls a wider definition than the cron sweeps
 * spins forever on work nobody is doing, and a scorer that publishes on a
 * narrower one puts out a band computed from half the test.
 *
 * WHAT COUNTS AS PENDING IS WHAT A SCORER CAN ACTUALLY DO SOMETHING WITH. Some
 * answers are band-less permanently and legitimately — a speaking answer whose
 * recording held no speech, a writing task left blank — and the scorers skip
 * them by design. Those are SETTLED, not pending: counting them would leave the
 * report waiting for a band that is never coming, and would have parked the
 * sweeper on rows it can never clear.
 */

/**
 * The two AI-scored sections, stated as their own condition.
 *
 * Redundant against the section equalities inside the predicates below — and
 * kept anyway, because it is what makes the partial index on
 * (band IS NULL AND section IN (…)) usable. Postgres has to PROVE a query
 * implies an index's predicate before it may use it, and proving that from a
 * two-branch OR is not something to rely on: without this the sweep silently
 * degrades to a sequential scan of the busiest table, every five minutes.
 */
export const AI_SECTIONS = ["writing", "speaking"] as const;

/**
 * How long an unscored answer is left alone before the sweeper touches it.
 *
 * PAST THE LONGEST `after()` CAN POSSIBLY RUN, which is what sets the number.
 * `after()` gets first refusal on every submit, and the two must never work the
 * same rows at once: the scorers claim nothing when they read, so a race is not
 * a no-op — both runs see `band IS NULL` and both pay a provider for every
 * answer. The submit routes cap at maxDuration = 300s, so nothing scheduled
 * there can still be running six minutes later, and this cannot overlap it.
 */
export const SCORING_GRACE_MINUTES = 6;

/**
 * How far back the sweeper looks — and therefore how long an answer can still be
 * said to be "on its way".
 *
 * A row still failing hours later is not going to be rescued by another call: it
 * is an outage that outlived its answer, or a payload the provider will keep
 * rejecting. Past this it stops costing provider requests and becomes a support
 * question instead.
 *
 * IT IS ALSO WHEN THE REPORT STOPS SAYING "MARKING". Past this point no run is
 * going to pick the answer up, so a screen that goes on promising a band is
 * lying to the candidate. See `mockScoringArriving`.
 */
export const SCORING_LOOKBACK_HOURS = 3;

/** Practice and section-practice answers a scorer can still do something with. */
export const scorableResponse = or(
  // A writing task with something written in it. `->>` yields NULL for a missing
  // key and for JSON null alike, which coalesce folds into the empty case.
  and(
    eq(userResponses.section, "writing"),
    sql`coalesce(btrim(${userResponses.response}->>'text'), '') <> ''`,
  ),
  // A speaking answer with a recording that has not already been judged
  // unscorable (no speech in it — a permanent fact, recorded as a verdict).
  //
  // THE TEST IS THE VERDICT, NOT THE COLUMN. It used to be `ai_feedback IS NULL`,
  // which quietly meant "nothing may ever be written here or the answer leaves
  // the retry queue" — so a transient failure could not be recorded without
  // making it look permanent. `unscorable` is the settled outcome; a `lastError`
  // breadcrumb beside it keeps the row retryable. See failureFeedback().
  and(
    eq(userResponses.section, "speaking"),
    isNotNull(userResponses.audioUrl),
    sql`${userResponses.aiFeedback} -> 'unscorable' is null`,
  ),
);

/** The same definition, for a mock sitting's answers. */
export const scorableMockAnswer = or(
  and(
    eq(mockTestAnswers.section, "writing"),
    sql`coalesce(btrim(${mockTestAnswers.response}->>'text'), '') <> ''`,
  ),
  and(
    eq(mockTestAnswers.section, "speaking"),
    isNotNull(mockTestAnswers.audioUrl),
    sql`${mockTestAnswers.aiFeedback} -> 'unscorable' is null`,
  ),
);

/**
 * Answers in this sitting that have something to score and no band yet.
 *
 * NO TIME LIMIT ON THIS ONE. It is the question the scorers ask before writing a
 * module band — "is this module fully marked?" — and the answer to that does not
 * improve with age. An answer that was recorded and never scored is a hole in the
 * module whether it happened four minutes ago or four hours ago, and a band
 * published over the hole is a band for a test that was not marked.
 *
 * `section` narrows it to one module. Omitted, it answers for the sitting.
 */
export async function mockScoringIncomplete(
  sessionId: string,
  section?: "writing" | "speaking",
): Promise<number> {
  const [row] = await db
    .select({ pending: sql<number>`count(*)::int` })
    .from(mockTestAnswers)
    .where(
      and(
        eq(mockTestAnswers.sessionId, sessionId),
        isNull(mockTestAnswers.band),
        section ? eq(mockTestAnswers.section, section) : undefined,
        scorableMockAnswer,
      ),
    );

  return row?.pending ?? 0;
}

/**
 * Of those, the ones something is still going to be done about.
 *
 * THE SAME ROWS, INSIDE THE SWEEPER'S WINDOW — which is the difference between
 * "not marked" and "not marked yet". The report polls this: past the window
 * nothing is coming, so the spinner has to stop even though the module is still
 * incomplete, and the candidate is told that rather than watched over by an
 * animation that will never resolve.
 *
 * It is deliberately NOT what decides whether a band is published; see
 * `mockScoringIncomplete`. Giving up on scoring an answer is not the same as
 * deciding the module can be graded without it.
 */
export async function mockScoringArriving(sessionId: string): Promise<number> {
  const horizon = new Date(Date.now() - SCORING_LOOKBACK_HOURS * 3600_000);

  const [row] = await db
    .select({ pending: sql<number>`count(*)::int` })
    .from(mockTestAnswers)
    .where(
      and(
        eq(mockTestAnswers.sessionId, sessionId),
        isNull(mockTestAnswers.band),
        gt(mockTestAnswers.answeredAt, horizon),
        scorableMockAnswer,
      ),
    );

  return row?.pending ?? 0;
}
