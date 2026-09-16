import "server-only";

import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  mockTestAnswers,
  mockTestResults,
  mockTestSections,
  mockTestSessions,
} from "@/db/schema";
import { QUESTION_TYPES, type QuestionTypeKey } from "@/lib/ielts";
import { keyFromUrl, presignGetUrl } from "@/lib/speech/s3";
import { analyzeSpeaking, partFor } from "@/lib/speech/ielts-speaking";
import { scoreWriting, type WritingTaskType } from "@/lib/writing/openai";
import { mockScoringIncomplete } from "./pending";
import { resolvePrompts } from "./prompts";
import { failureFeedback, speakingFeedback, unscorableFeedback } from "./speaking-feedback";
import { mapWithConcurrency } from "./concurrency";

/**
 * AI band scoring for a finished mock sitting.
 *
 * WHY THIS IS NOT IN mock.ts. Both functions take a `userId`, and everything
 * exported from a "use server" module is a callable endpoint — exporting these
 * there would let any client pass someone else's id and spend their AI quota.
 * The id must be established by the caller (`requireUser()`, or a session
 * already verified before the response was sent).
 *
 * Taking the id as an argument is also what makes these runnable with no request
 * at all: inside `after()` at hand-in, and from the scoring sweeper cron.
 *
 * This is the mock-sitting twin of score-attempt.ts, and carries the same two
 * guarantees: IDEMPOTENT (only rows with no band are touched, so a retry or a
 * second visit cannot double-charge the API) and NON-THROWING on a scoring
 * failure (an answer is left unscored and the sitting stands — losing a
 * submitted answer to a third-party outage is never acceptable).
 */

/**
 * How many mock answers are scored at once.
 *
 * Matches the practice path. A mock's Speaking module is longer than a practice
 * set, so sequential scoring hurt most here — but the ceiling still keeps
 * parallel calls well short of being throttled by the scoring APIs.
 */
const MOCK_SCORING_CONCURRENCY = 6;

/** Signed-URL lifetime for a recording handed to the scorer. See score-attempt. */
const MOCK_SIGNED_URL_TTL_SEC = 3600;

/** Confirm the sitting belongs to this user before spending anything on it. */
async function ownedSitting(
  userId: string,
  sessionId: string,
): Promise<{ module: "academic" | "general" } | null> {
  const [session] = await db
    .select({ module: mockTestSessions.module })
    .from(mockTestSessions)
    .where(and(eq(mockTestSessions.id, sessionId), eq(mockTestSessions.userId, userId)))
    .limit(1);
  return session ?? null;
}

export async function scoreMockSpeakingFor(
  userId: string,
  sessionId: string,
): Promise<{ scored: number }> {
  if (!(await ownedSitting(userId, sessionId))) return { scored: 0 };

  const rows = await db
    .select()
    .from(mockTestAnswers)
    .where(
      and(
        eq(mockTestAnswers.sessionId, sessionId),
        eq(mockTestAnswers.section, "speaking"),
        isNull(mockTestAnswers.band),
        isNotNull(mockTestAnswers.audioUrl),
        // Bandless but WITH feedback means this recording was already found to
        // hold no speech — re-calling the API would buy the same answer twice.
        sql`${mockTestAnswers.aiFeedback} -> 'unscorable' is null`,
      ),
    );
  // NOTHING LEFT TO SCORE IS NOT NOTHING LEFT TO DO. Answers are scored as they
  // are given now, so the run at hand-in routinely finds an empty queue — and
  // returning here without publishing was how a fully-scored module ended up
  // with no band at all. Publishing is idempotent and costs one indexed read.
  if (rows.length === 0) {
    await publishSpeakingBand(sessionId);
    return { scored: 0 };
  }

  // Part 2 asks its question as a cue card, so the prompt has to be assembled
  // from topic + bullets rather than read off a single field. The section id +
  // item number pair is exactly what resolvePrompts already understands.
  const prompts = await resolvePrompts(
    rows.map((r) => ({
      id: r.id,
      questionId: null,
      setId: r.sectionId,
      questionNumber: r.questionNumber,
    })),
  );

  // Scored TOGETHER, not one after another: each call is a ~15s round trip, so a
  // Speaking module done in sequence kept a candidate waiting minutes for the
  // first band. Each answer is contained — a failure on one must not abandon the
  // rest of the batch — but never swallowed silently.
  //
  // THIS IS NOW THE FALLBACK PATH, not the usual one. Takes are scored as they
  // are given (see `scoreMockSpeakingAnswerFor`), so by hand-in there is usually
  // nothing here to do. What is left is the answers that path missed: a failed
  // call, a tab closed before the request went out, a sitting from before that
  // path existed.
  const results = await mapWithConcurrency(rows, MOCK_SCORING_CONCURRENCY, (row) =>
    scoreSpeakingRow(row, prompts.get(row.id)).catch((e) => {
      console.error(`[scoring] mock speaking: threw answer=${row.id}`, e);
      return null;
    }),
  );

  const bands = results.filter((b): b is number => b !== null);
  const scored = bands.length;
  // One line per run, always. "0 of 5 scored" is the difference between a
  // reported bug and a silently broken integration.
  console.info(
    `[scoring] mock speaking run session=${sessionId} scored=${scored} failed=${rows.length - scored}`,
  );

  if (scored > 0) await publishSpeakingBand(sessionId);

  return { scored };
}

/**
 * What the PAPER asks in one AI-scored module — not what the candidate answered.
 *
 * THIS IS THE DENOMINATOR, and getting it from the paper rather than from the
 * rows is the whole point. A question nobody answered leaves no row behind
 * (`submitSitting` writes only what was attempted), so averaging over the rows
 * meant a candidate who answered three of eleven questions was marked out of
 * three. Silence scored nothing and cost nothing, and a Speaking band came back
 * from a test that was a quarter sat.
 *
 * Read off `mock_test_sections`, which is the paper's own definition, so it does
 * not depend on the sitting having loaded any content.
 */
async function askedInModule(
  sessionId: string,
  section: "writing" | "speaking",
): Promise<number> {
  const [row] = await db
    .select({ asked: sql<number>`coalesce(sum(${mockTestSections.totalQuestions}), 0)::int` })
    .from(mockTestSections)
    .innerJoin(mockTestSessions, eq(mockTestSessions.mockTestId, mockTestSections.mockTestId))
    .where(and(eq(mockTestSessions.id, sessionId), eq(mockTestSections.section, section)));

  return row?.asked ?? 0;
}

/**
 * Work out both AI module bands for a finished sitting, spending nothing.
 *
 * NEEDED BECAUSE SCORING AND PUBLISHING CAME APART. Answers are marked as they
 * are given now, so hand-in routinely has nothing left to score — and the
 * scheduler's "nothing pending, return early" shortcut would then skip the step
 * that writes the module bands onto the report, leaving a fully-marked sitting
 * showing no Writing or Speaking band at all.
 *
 * Both publishers are idempotent, withhold on their own terms, and cost two
 * indexed reads between them. Safe to call whenever a sitting might be complete.
 */
export async function publishMockBands(sessionId: string): Promise<void> {
  await publishSpeakingBand(sessionId);
  await publishWritingBand(sessionId);
}

/** One speaking answer row, as the scorer needs it. */
type SpeakingRow = typeof mockTestAnswers.$inferSelect;
type ResolvedPrompt = Awaited<ReturnType<typeof resolvePrompts>> extends Map<string, infer V>
  ? V
  : never;

/**
 * Score ONE recorded answer, and write the outcome onto its row.
 *
 * Extracted from the batch so a single take can be scored the moment it is
 * given — see `scoreMockSpeakingAnswerFor`. The batch and the live path must not
 * become two implementations of "how a speaking answer is marked"; they are one,
 * called with one row or with eleven.
 *
 * Returns the band, or null for any outcome that is not one.
 */
async function scoreSpeakingRow(
  row: SpeakingRow,
  resolved: ResolvedPrompt | undefined,
): Promise<number | null> {
  const key = row.audioUrl ? keyFromUrl(row.audioUrl) : null;
  if (!key) {
    console.warn(`[scoring] mock speaking: unreadable audioUrl answer=${row.id} url=${row.audioUrl}`);
    return null;
  }
  // The scorer fetches the recording straight from S3, so no audio passes
  // through this process at all.
  const audioUrl = await presignGetUrl(key, MOCK_SIGNED_URL_TTL_SEC);
  if (!audioUrl) {
    console.warn(`[scoring] mock speaking: could not presign audio answer=${row.id} key=${key}`);
    return null;
  }

  // NOT falling back to the type's generic instruction: relevance is judged
  // against whatever we send, so "Answer questions about yourself" would mark an
  // on-topic answer as off-topic. Omitting it is the honest option when we cannot
  // say what was asked. A cue card goes over structured, so the long turn is
  // assessed against each bullet it was meant to cover.
  const cueCard = resolved?.cueCard ?? null;
  const question = cueCard ? cueCard.topic || undefined : (resolved?.prompt ?? undefined);

  const res = await analyzeSpeaking({
    audioUrl,
    part: partFor(row.questionType as QuestionTypeKey),
    question,
    cueCardPoints: cueCard?.bullets,
  });

  if (!res.ok) {
    // INTERPOLATED, NOT PASSED AS AN OBJECT. Every sink formats a string; not
    // every sink formats the second argument. The dev server's log forwarder in
    // particular rendered each of these as a bare `{}`, so eight identical "not
    // scored" lines carried no reason, no status and no answer id — which is how
    // a run of transient provider failures looked exactly like broken recordings,
    // and stayed unexplained until someone re-scored one by hand.
    console.error(
      `[scoring] mock speaking: not scored answer=${row.id} reason=${res.reason}` +
        ` status=${res.status ?? "-"} detail=${res.detail ?? "-"}`,
    );
    // A recording with no speech in it can never be scored, so it is recorded as
    // a VERDICT rather than left looking like a band still on its way. Anything
    // else is recorded as a BREADCRUMB: same column, different key, and
    // `scorableMockAnswer` only treats the verdict as settled — so the row stays
    // in the sweeper's queue and still gets retried, while we stop losing the
    // reason it needed retrying. See failureFeedback().
    await db
      .update(mockTestAnswers)
      .set({
        aiFeedback:
          res.reason === "no_speech" || res.reason === "bad_audio"
            ? unscorableFeedback(res.reason, res.detail)
            : failureFeedback(res.reason, res.status, res.detail),
      })
      .where(eq(mockTestAnswers.id, row.id));
    return null;
  }

  const a = res.assessment;
  await db
    .update(mockTestAnswers)
    .set({
      band: a.overall.band.toFixed(1),
      transcript: a.transcript.text,
      aiFeedback: speakingFeedback(a, Boolean(question)),
    })
    .where(eq(mockTestAnswers.id, row.id));
  return a.overall.band;
}

/**
 * Mark one answer, as soon as the candidate has given it.
 *
 * WHY NOT WAIT FOR HAND-IN, which is what this used to do. A Speaking module is
 * eleven recordings, and marking them together meant eleven provider calls in
 * one burst at six-way concurrency. That burst is what tripped the provider: on
 * one sitting eight of eleven answers came back refused, and every one of them
 * scored perfectly well on a later retry. It also meant the candidate waited for
 * the whole module to be marked after handing in, when the first answer could
 * have been marked a quarter of an hour earlier.
 *
 * An interview hands us one recording a minute. Marking each as it arrives
 * spreads the same work over time the candidate is spending anyway, and the
 * report is ready when they finish.
 *
 * SCOPED TO ONE ROW BY ID, deliberately. Calling the whole-sitting scorer once
 * per take would put several runs against the same `band IS NULL` set at once,
 * and — since nothing is claimed on read — every one of them would pay for every
 * answer in it.
 *
 * THE MODULE BAND IS NOT TOUCHED HERE. `publishSpeakingBand` needs a report row
 * to write to and there is none until hand-in, where the batch path runs, finds
 * an empty queue and publishes.
 */
export async function scoreMockSpeakingAnswerFor(
  userId: string,
  answerId: string,
): Promise<{ scored: number }> {
  const [joined] = await db
    .select()
    .from(mockTestAnswers)
    .innerJoin(mockTestSessions, eq(mockTestSessions.id, mockTestAnswers.sessionId))
    .where(
      and(
        eq(mockTestAnswers.id, answerId),
        eq(mockTestSessions.userId, userId),
        eq(mockTestAnswers.section, "speaking"),
        isNull(mockTestAnswers.band),
        isNotNull(mockTestAnswers.audioUrl),
        sql`${mockTestAnswers.aiFeedback} -> 'unscorable' is null`,
      ),
    )
    .limit(1);
  if (!joined) return { scored: 0 };

  const answer = joined.mock_test_answers;
  const prompts = await resolvePrompts([
    { id: answer.id, questionId: null, setId: answer.sectionId, questionNumber: answer.questionNumber },
  ]);

  const band = await scoreSpeakingRow(answer, prompts.get(answer.id)).catch((e) => {
    console.error(`[scoring] mock speaking live: threw answer=${answer.id}`, e);
    return null;
  });
  console.info(`[scoring] mock speaking live answer=${answer.id} band=${band ?? "-"}`);
  return { scored: band === null ? 0 : 1 };
}

/**
 * Work out the Speaking band for a sitting — from ALL of it, and only once all
 * of it is in.
 *
 * TWO BUGS LIVED IN THE THREE LINES THIS REPLACES, and they compounded.
 *
 * It averaged `bands`, which is what THIS RUN scored. The run only ever selects
 * rows with no band, so a sitting scored in two passes — `after()` at hand-in
 * and the sweeper cron for whatever that missed — ended up with a module band
 * that was the mean of the stragglers alone. One late answer at 4.0 turned a
 * 7.0 module into a 4.0, and nothing about the report said so.
 *
 * And it published whatever it had. A provider hiccup that dropped eight of
 * eleven answers still produced a confident Speaking band, computed from the
 * three that survived and presented exactly like one computed from all eleven.
 * That is not a slightly-off band; it is a band for a test that was not marked.
 *
 * SO: the mean is taken over every banded answer in the sitting, and it is not
 * written at all while any answer might still be scored. Held back, the report
 * keeps saying "marking your answers" — true, and far better than a number.
 * `mockScoringIncomplete` is what decides that, and it has no time limit: giving
 * up on scoring an answer is not the same as deciding the module can be graded
 * without it. A module we could not mark has no band, and says so.
 *
 * AN ANSWER THAT CAN NEVER BE SCORED DOES NOT HOLD THE BAND, and does not join
 * the mean either. A recording with no speech in it is settled — the candidate
 * is told so against that question — and there is no band to average in.
 */
async function publishSpeakingBand(sessionId: string): Promise<void> {
  if ((await mockScoringIncomplete(sessionId, "speaking")) > 0) return;

  const rows = await db
    .select({ band: mockTestAnswers.band })
    .from(mockTestAnswers)
    .where(
      and(
        eq(mockTestAnswers.sessionId, sessionId),
        eq(mockTestAnswers.section, "speaking"),
        isNotNull(mockTestAnswers.band),
      ),
    );

  const all = rows.map((r) => Number(r.band)).filter((b) => Number.isFinite(b));
  if (all.length === 0) return;

  /**
   * OUT OF WHAT THE PAPER ASKED, not out of what came back.
   *
   * Every question the candidate did not answer — never recorded, or recorded
   * with no speech in it — counts as a zero, which is what IELTS means by Band 0:
   * did not attempt. Averaging over the answers alone marked a quarter-sat test
   * out of a quarter and reported the result as a Speaking band.
   *
   * `Math.max` guards the arithmetic rather than the policy: if a paper's stored
   * question count ever disagreed with the rows we hold, the denominator must
   * still not be smaller than the number of bands going into it, or a module
   * could score above 9.
   */
  const asked = Math.max(await askedInModule(sessionId, "speaking"), all.length);

  // The module band is the mean of its answers, rounded to the nearest half
  // band — the IELTS convention.
  const mean = all.reduce((a, b) => a + b, 0) / asked;
  await recomputeOverall(sessionId, "speaking", Math.round(mean * 2) / 2);
}

export async function scoreMockWritingFor(
  userId: string,
  sessionId: string,
): Promise<{ scored: number }> {
  const session = await ownedSitting(userId, sessionId);
  if (!session) return { scored: 0 };
  const sittingModule = session.module;

  const rows = await db
    .select()
    .from(mockTestAnswers)
    .where(
      and(
        eq(mockTestAnswers.sessionId, sessionId),
        eq(mockTestAnswers.section, "writing"),
        isNull(mockTestAnswers.band),
      ),
    );
  if (rows.length === 0) return { scored: 0 };

  const prompts = await resolvePrompts(
    rows.map((r) => ({
      id: r.id,
      questionId: null,
      setId: r.sectionId,
      questionNumber: r.questionNumber,
    })),
  );

  // Graded together; a two-task paper should not wait for Task 2 to record Task 1.
  const graded = await mapWithConcurrency(rows, MOCK_SCORING_CONCURRENCY, (row) =>
    gradeOne(row).catch((e) => {
      console.error(`[scoring] mock writing: threw answer=${row.id}`, e);
      return false;
    }),
  );
  const scored = graded.filter(Boolean).length;
  console.info(
    `[scoring] mock writing run session=${sessionId} scored=${scored} failed=${rows.length - scored}`,
  );

  async function gradeOne(row: (typeof rows)[number]): Promise<boolean> {
    const r = row.response as Record<string, unknown> | null;
    const text = typeof r?.text === "string" ? r.text.trim() : "";
    if (!text) return false;

    const qt = row.questionType as QuestionTypeKey;
    const meta = QUESTION_TYPES[qt];
    if (!meta || meta.family !== "writing") return false;

    const resolved = prompts.get(row.id);
    const res = await scoreWriting({
      text,
      taskType: qt as WritingTaskType,
      // THE SITTING'S module, not the user's current target. A candidate who
      // switches target after sitting a General paper must still have it graded
      // against General — and there is no session to read a target from here.
      module: sittingModule,
      // Unlike speaking, a missing prompt DOES fall back to the type's
      // instruction: the grader cannot grade at all without some statement of task.
      questionPrompt: resolved?.prompt ?? meta.instruction ?? "",
      // The minimum authored for THIS task wins over the type default.
      wordMin: resolved?.wordLimitMin ?? meta.wordLimitMin ?? (qt === "writing_task2" ? 250 : 150),
    });
    if (!res.ok) {
      // Silent until now, which made a graded Task 1 next to an ungraded Task 2
      // indistinguishable from a Task 2 nobody wrote. Same interpolation rule as
      // the speaking failure above.
      console.error(
        `[scoring] mock writing: not scored answer=${row.id} reason=${res.reason}` +
          ` status=${res.status ?? "-"} detail=${res.detail ?? "-"}`,
      );
      // Same breadcrumb as speaking. A writing row is queued on having text, not
      // on its feedback column, so this cannot take it out of the retry queue.
      await db
        .update(mockTestAnswers)
        .set({ aiFeedback: failureFeedback(res.reason, res.status, res.detail) })
        .where(eq(mockTestAnswers.id, row.id));
      return false;
    }

    const s = res.score;
    await db
      .update(mockTestAnswers)
      .set({
        band: s.overall.toFixed(1),
        aiFeedback: {
          onTask: s.onTask,
          wordCount: s.wordCount,
          gradedWordCount: s.gradedWordCount,
          overallFeedback: s.overallFeedback,
          criteria: s.criteria,
          corrections: s.corrections,
          improvedExamples: s.improvedExamples,
          nextSteps: s.nextSteps,
          taskCompliance: s.taskCompliance,
          provider: "openai",
        },
      })
      .where(eq(mockTestAnswers.id, row.id));
    return true;
  }

  if (scored > 0) await publishWritingBand(sessionId);

  return { scored };
}

/**
 * The Writing band for a sitting, on the same terms as Speaking above: read back
 * from every graded task rather than from whatever this run happened to grade,
 * and withheld while either task might still be graded.
 *
 * The tasks are read back rather than accumulated in memory for the reason set
 * out in `publishSpeakingBand` — a second pass over the same sitting used to
 * recompute the band from its own results alone, so a Task 2 rescued by the
 * sweeper replaced a two-task band with a one-task one.
 */
async function publishWritingBand(sessionId: string): Promise<void> {
  if ((await mockScoringIncomplete(sessionId, "writing")) > 0) return;

  const rows = await db
    .select({ band: mockTestAnswers.band, questionType: mockTestAnswers.questionType })
    .from(mockTestAnswers)
    .where(
      and(
        eq(mockTestAnswers.sessionId, sessionId),
        eq(mockTestAnswers.section, "writing"),
        isNotNull(mockTestAnswers.band),
      ),
    );

  // Kept apart so the official IELTS weighting (Task 2 ×2, Task 1 ×1) applies.
  const task1Bands: number[] = [];
  const task2Bands: number[] = [];
  for (const r of rows) {
    const b = Number(r.band);
    if (!Number.isFinite(b)) continue;
    (r.questionType === "writing_task2" ? task2Bands : task1Bands).push(b);
  }

  /**
   * WHICH TASKS THE PAPER SET, from the paper — because a task left blank leaves
   * no row, and a rule written against the rows cannot tell "not set" from "not
   * attempted".
   *
   * That distinction was worth real marks. The old rule was "if only one task
   * was attempted, use it alone", so a candidate who wrote a Band 7 Task 1 and
   * left Task 2 entirely blank was awarded Writing 7.0 — for half a paper, and
   * the missing half was the one weighted double. A blank task is a zero, and
   * the weighting applies to it like any other score.
   *
   * Writing parts are numbered as the tasks they are; the player labels them
   * from the same field.
   */
  const parts = await db
    .select({ partNumber: mockTestSections.partNumber })
    .from(mockTestSections)
    .innerJoin(mockTestSessions, eq(mockTestSessions.mockTestId, mockTestSections.mockTestId))
    .where(and(eq(mockTestSessions.id, sessionId), eq(mockTestSections.section, "writing")));

  const setTask1 = parts.some((p) => p.partNumber === 1) || task1Bands.length > 0;
  const setTask2 = parts.some((p) => p.partNumber === 2) || task2Bands.length > 0;
  if (!setTask1 && !setTask2) return;
  // Nothing graded at all is not a zero — it is a module we have not marked, and
  // `mockScoringIncomplete` above has already decided nothing more is coming.
  if (task1Bands.length === 0 && task2Bands.length === 0) return;

  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const t1 = avg(task1Bands);
  const t2 = avg(task2Bands);

  // Official IELTS: the Writing band weights Task 2 twice as heavily as Task 1
  // → (T1 + 2·T2) / 3. A task the paper set and the candidate did not write
  // enters that sum as the zero it is.
  const writingBand =
    setTask1 && setTask2 ? (t1 + 2 * t2) / 3 : setTask2 ? t2 : t1;

  await recomputeOverall(sessionId, "writing", Math.round(writingBand * 2) / 2);
}

/** Re-average the report now that an AI-scored module band exists. */
async function recomputeOverall(
  sessionId: string,
  section: "writing" | "speaking",
  band: number,
): Promise<void> {
  const [result] = await db
    .select()
    .from(mockTestResults)
    .where(eq(mockTestResults.sessionId, sessionId))
    .limit(1);
  if (!result) return;

  const num = (b: string | null) => (b === null ? null : Number(b));
  const writingBand = section === "writing" ? band : num(result.writingBand);
  const speakingBand = section === "speaking" ? band : num(result.speakingBand);

  const present = [num(result.listeningBand), num(result.readingBand), writingBand, speakingBand]
    .filter((b): b is number => b !== null);

  const overall =
    present.length > 0
      ? Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 2) / 2
      : null;

  await db
    .update(mockTestResults)
    .set({
      ...(section === "writing" ? { writingBand: band.toFixed(1) } : { speakingBand: band.toFixed(1) }),
      overallBand: overall === null ? null : overall.toFixed(1),
    })
    .where(eq(mockTestResults.sessionId, sessionId));
}
