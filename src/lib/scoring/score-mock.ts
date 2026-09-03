import "server-only";

import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { mockTestAnswers, mockTestResults, mockTestSessions } from "@/db/schema";
import { QUESTION_TYPES, type QuestionTypeKey } from "@/lib/ielts";
import { keyFromUrl, presignGetUrl } from "@/lib/speech/s3";
import { analyzeSpeaking, partFor } from "@/lib/speech/ielts-speaking";
import { scoreWriting, type WritingTaskType } from "@/lib/writing/openai";
import { resolvePrompts } from "./prompts";
import { speakingFeedback, unscorableFeedback } from "./speaking-feedback";
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
        isNull(mockTestAnswers.aiFeedback),
      ),
    );
  if (rows.length === 0) return { scored: 0 };

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
  const results = await mapWithConcurrency(rows, MOCK_SCORING_CONCURRENCY, (row) =>
    scoreOne(row).catch((e) => {
      console.error("[scoring] mock speaking: threw", { answerId: row.id, error: e });
      return null;
    }),
  );

  const bands = results.filter((b): b is number => b !== null);
  const scored = bands.length;
  // One line per run, always. "0 of 5 scored" is the difference between a
  // reported bug and a silently broken integration.
  console.info("[scoring] mock speaking run", { sessionId, scored, failed: rows.length - scored });

  async function scoreOne(row: (typeof rows)[number]): Promise<number | null> {
    const key = row.audioUrl ? keyFromUrl(row.audioUrl) : null;
    if (!key) {
      console.warn("[scoring] mock speaking: unreadable audioUrl", { answerId: row.id });
      return null;
    }
    // The scorer fetches the recording straight from S3, so no audio passes
    // through this process at all.
    const audioUrl = await presignGetUrl(key, MOCK_SIGNED_URL_TTL_SEC);
    if (!audioUrl) {
      console.warn("[scoring] mock speaking: could not presign audio", { answerId: row.id, key });
      return null;
    }

    // NOT falling back to the type's generic instruction: relevance is judged
    // against whatever we send, so "Answer questions about yourself" would mark
    // an on-topic answer as off-topic. Omitting it is the honest option when we
    // cannot say what was asked. A cue card goes over structured, so the long
    // turn is assessed against each bullet it was meant to cover.
    const resolved = prompts.get(row.id);
    const cueCard = resolved?.cueCard ?? null;
    const question = cueCard ? cueCard.topic || undefined : (resolved?.prompt ?? undefined);

    const res = await analyzeSpeaking({
      audioUrl,
      part: partFor(row.questionType as QuestionTypeKey),
      question,
      cueCardPoints: cueCard?.bullets,
    });

    if (!res.ok) {
      console.error("[scoring] mock speaking: not scored", {
        answerId: row.id,
        reason: res.reason,
        detail: res.detail,
      });
      // A recording with no speech in it can never be scored, so it is recorded
      // as such rather than left looking like a band still on its way.
      if (res.reason === "no_speech" || res.reason === "bad_audio") {
        await db
          .update(mockTestAnswers)
          .set({ aiFeedback: unscorableFeedback(res.reason, res.detail) })
          .where(eq(mockTestAnswers.id, row.id));
      }
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

  if (bands.length > 0) {
    // The module band is the mean of its answers, rounded to the nearest half
    // band — the IELTS convention.
    const mean = bands.reduce((a, b) => a + b, 0) / bands.length;
    await recomputeOverall(sessionId, "speaking", Math.round(mean * 2) / 2);
  }

  return { scored };
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

  // Kept apart so the official IELTS weighting (Task 2 ×2, Task 1 ×1) applies.
  const task1Bands: number[] = [];
  const task2Bands: number[] = [];

  // Graded together; a two-task paper should not wait for Task 2 to record Task 1.
  const graded = await mapWithConcurrency(rows, MOCK_SCORING_CONCURRENCY, (row) =>
    gradeOne(row).catch((e) => {
      console.error("[scoring] mock writing: threw", { answerId: row.id, error: e });
      return false;
    }),
  );
  const scored = graded.filter(Boolean).length;
  console.info("[scoring] mock writing run", { sessionId, scored, failed: rows.length - scored });

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
    if (!res.ok) return false;

    const s = res.score;
    (qt === "writing_task2" ? task2Bands : task1Bands).push(s.overall);
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

  if (task1Bands.length > 0 || task2Bands.length > 0) {
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    // Official IELTS: the Writing band weights Task 2 twice as heavily as Task 1
    // → (T1 + 2·T2) / 3. If only one task was attempted, use it alone.
    let writingBand: number;
    if (task1Bands.length && task2Bands.length) {
      writingBand = (avg(task1Bands) + 2 * avg(task2Bands)) / 3;
    } else {
      writingBand = task2Bands.length ? avg(task2Bands) : avg(task1Bands);
    }
    await recomputeOverall(sessionId, "writing", Math.round(writingBand * 2) / 2);
  }

  return { scored };
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
