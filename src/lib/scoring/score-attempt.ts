import "server-only";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { userResponses } from "@/db/schema";
import { QUESTION_TYPES, type QuestionTypeKey } from "@/lib/ielts";
import { keyFromUrl, presignGetUrl } from "@/lib/speech/s3";
import { analyzeSpeaking, partFor } from "@/lib/speech/ielts-speaking";
import { speakingFeedback, unscorableFeedback } from "./speaking-feedback";
import { scoreWriting, type WritingTaskType } from "@/lib/writing/openai";
import { resolvePrompts } from "./prompts";
import { mapWithConcurrency } from "./concurrency";

/**
 * AI band scoring for one attempt's subjective answers.
 *
 * WHY THIS IS NOT IN A "use server" FILE. Both functions take a `userId`, and
 * everything exported from a "use server" module is a callable endpoint — so
 * exporting these there would let any client pass someone else's id and both
 * read their answers and spend their AI quota. The id is supplied by the caller,
 * which must have established it itself (`requireUser()`, or a session already
 * verified before the response was sent).
 *
 * Taking the id as an argument is also what makes these runnable with no request
 * at all: inside `after()`, and later from a worker or a re-score job.
 *
 * Both are IDEMPOTENT — they only touch rows where `band IS NULL` — so a retry,
 * a refresh, or a second visit cannot double-score or re-charge the API. That
 * property is what lets a submit path and a UI trigger both fire safely.
 *
 * Neither throws on a scoring failure: a row is left unscored and the attempt
 * stands. Losing a submitted answer to a third-party outage is never acceptable.
 */

/**
 * How many answers are scored at once.
 *
 * Six covers a full Part 1 (seven questions) in two waves and a Writing paper in
 * one, while staying well short of the point where parallel calls to the scoring
 * APIs start being throttled.
 */
const SCORING_CONCURRENCY = 6;

/**
 * How long a recording's signed URL stays valid.
 *
 * It must outlive the whole call, not just the grading: the service holds the
 * connection for 15-40s, and anything queued ahead of it waits on top of that.
 * An expired URL fails as "couldn't fetch the audio", which is indistinguishable
 * from a genuinely broken recording — so this is set with room to spare rather
 * than trimmed to the expected duration.
 */
const SIGNED_URL_TTL_SEC = 3600;

/** Shape both scorers report back, so callers can tell the user what happened. */
export type ScoreRunResult = { scored: number; failed: number };

export async function scoreAttemptSpeakingFor(
  userId: string,
  attemptId: string,
): Promise<ScoreRunResult> {
  const rows = await db
    // Only what scoring needs. `select()` also pulled `response`, `transcript`
    // and the previous `aiFeedback` jsonb for every row, none of which is read
    // on the way in.
    .select({
      id: userResponses.id,
      questionId: userResponses.questionId,
      setId: userResponses.setId,
      questionNumber: userResponses.questionNumber,
      questionType: userResponses.questionType,
      audioUrl: userResponses.audioUrl,
    })
    .from(userResponses)
    .where(
      and(
        eq(userResponses.attemptId, attemptId),
        eq(userResponses.userId, userId),
        eq(userResponses.section, "speaking"),
        isNull(userResponses.band),
        // No recording, nothing to score — and audioUrl is what carries it,
        // whether the row came from a question set or a section document.
        isNotNull(userResponses.audioUrl),
        // Bandless but WITH feedback means we already established this recording
        // can never be scored (no speech in it). Re-calling the API on every
        // retry would spend a real request to be told the same thing again.
        isNull(userResponses.aiFeedback),
      ),
    );
  if (rows.length === 0) return { scored: 0, failed: 0 };

  const prompts = await resolvePrompts(rows);

  // Answers are scored TOGETHER, not one after another. Each call is a ~15s round
  // trip, so a seven-question Part 1 done in sequence made a candidate wait over
  // two minutes; in parallel the whole set lands in roughly the slowest single call.
  // Each row is also written to the database the moment its own score arrives,
  // rather than after the batch, so the report fills in as results come back.
  const outcomes = await mapWithConcurrency(rows, SCORING_CONCURRENCY, (row) =>
    // ISOLATED PER ANSWER. mapWithConcurrency propagates a throw, as a
    // general-purpose primitive should — but here that would abandon every
    // answer still queued behind the one that failed. A database blip on
    // question 3 must not cost questions 4 to 7 their bands, so each is
    // contained and reported as unscored — but never swallowed silently, or a
    // whole batch can fail with nothing anywhere to say why.
    scoreOne(row).catch((e) => {
      console.error("[scoring] speaking: threw", { responseId: row.id, error: e });
      return false;
    }),
  );

  const scored = outcomes.filter(Boolean).length;
  const failed = outcomes.length - scored;
  // One line per run, always. "0 of 7 scored" in the log is the difference
  // between a reported bug and a silently broken integration.
  console.info("[scoring] speaking run", { attemptId, scored, failed });
  return { scored, failed };

  async function scoreOne(row: (typeof rows)[number]): Promise<boolean> {
    const key = row.audioUrl ? keyFromUrl(row.audioUrl) : null;
    if (!key) {
      console.warn("[scoring] speaking: unreadable audioUrl", { responseId: row.id });
      return false;
    }

    // The scorer fetches the recording itself, so the bytes never pass through
    // this process — no download, no re-encode, no multi-megabyte buffer held
    // for the length of a 40-second call. Signing is a local HMAC (~0.5ms).
    const audioUrl = await presignGetUrl(key, SIGNED_URL_TTL_SEC);
    if (!audioUrl) {
      console.warn("[scoring] speaking: could not presign audio", { responseId: row.id, key });
      return false;
    }

    // Deliberately NOT falling back to the question type's generic instruction:
    // relevance is judged against whatever we send, so a blurb like "Answer
    // questions about yourself" marks an on-topic answer as off-topic. Omitting
    // it is the honest option when we can't say what was asked.
    //
    // A cue card goes over STRUCTURED — topic as the question, bullets as the
    // points — because the API assesses whether the long turn covered each
    // bullet, which a single flattened string cannot express.
    const resolved = prompts.get(row.id);
    const cueCard = resolved?.cueCard ?? null;
    const question = cueCard ? cueCard.topic || undefined : (resolved?.prompt ?? undefined);

    const result = await analyzeSpeaking({
      audioUrl,
      part: partFor(row.questionType as QuestionTypeKey),
      question,
      cueCardPoints: cueCard?.bullets,
    });

    if (!result.ok) {
      // LOUD, not silent. Every one of these leaves the candidate looking at an
      // unscored answer, and without a line in the log there is nothing to tell
      // a missing key apart from a provider outage apart from a recording with
      // nothing in it.
      console.error("[scoring] speaking: not scored", {
        responseId: row.id,
        reason: result.reason,
        detail: result.detail,
      });
      // No speech in the recording is a permanent fact about it, not an outage.
      // Recording that stops the report screen waiting for a band that is never
      // coming, and tells the candidate what to do instead.
      if (result.reason === "no_speech" || result.reason === "bad_audio") {
        await db
          .update(userResponses)
          .set({ aiFeedback: unscorableFeedback(result.reason, result.detail) })
          .where(eq(userResponses.id, row.id));
      }
      return false;
    }

    const a = result.assessment;
    await db
      .update(userResponses)
      .set({
        band: a.overall.band.toFixed(1),
        transcript: a.transcript.text,
        aiFeedback: speakingFeedback(a, Boolean(question)),
      })
      .where(eq(userResponses.id, row.id));
    return true;
  }
}

export async function scoreAttemptWritingFor(
  userId: string,
  attemptId: string,
): Promise<ScoreRunResult> {
  const rows = await db
    // Only what grading needs; `aiFeedback` and `transcript` are write-only here.
    .select({
      id: userResponses.id,
      questionId: userResponses.questionId,
      setId: userResponses.setId,
      questionNumber: userResponses.questionNumber,
      questionType: userResponses.questionType,
      module: userResponses.module,
      response: userResponses.response,
    })
    .from(userResponses)
    .where(
      and(
        eq(userResponses.attemptId, attemptId),
        eq(userResponses.userId, userId),
        eq(userResponses.section, "writing"),
        isNull(userResponses.band),
      ),
    );
  if (rows.length === 0) return { scored: 0, failed: 0 };

  const prompts = await resolvePrompts(rows);

  // Graded together, and each task written as soon as its own grade arrives —
  // a two-task Writing paper shouldn't wait for Task 2 to show Task 1's band.
  // Contained per task, for the same reason as speaking above.
  const outcomes = await mapWithConcurrency(rows, SCORING_CONCURRENCY, (row) =>
    gradeOne(row).catch(() => false),
  );

  const scored = outcomes.filter((o) => o === true).length;
  // `null` means there was nothing to grade — not a failure.
  const failed = outcomes.filter((o) => o === false).length;
  return { scored, failed };

  async function gradeOne(row: (typeof rows)[number]): Promise<boolean | null> {
    const r = row.response as Record<string, unknown> | null;
    const text = typeof r?.text === "string" ? r.text.trim() : "";
    // Nothing written is not a failure to score — there is nothing to grade.
    if (!text) return null;

    const qt = row.questionType as QuestionTypeKey;
    const meta = QUESTION_TYPES[qt];
    if (!meta || meta.family !== "writing") return null;

    const resolved = prompts.get(row.id);
    // Unlike speaking, a missing prompt here does fall back to the type's
    // instruction: the grader is told what task it is grading and cannot produce a
    // grade at all without some statement of it.
    const questionPrompt = resolved?.prompt ?? meta.instruction ?? "";

    const result = await scoreWriting({
      text,
      taskType: qt as WritingTaskType,
      module: row.module,
      questionPrompt,
      // The authored minimum for THIS task wins over the type default — a
      // section can set its own.
      wordMin: resolved?.wordLimitMin ?? meta.wordLimitMin ?? (qt === "writing_task2" ? 250 : 150),
    });
    if (!result.ok) return false;

    const s = result.score;
    await db
      .update(userResponses)
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
      .where(eq(userResponses.id, row.id));
    return true;
  }
}
