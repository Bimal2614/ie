import "server-only";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { userResponses } from "@/db/schema";
import { QUESTION_TYPES, type QuestionTypeKey } from "@/lib/ielts";
import { downloadSpeakingAudio, keyFromUrl } from "@/lib/speech/s3";
import { isWav16kMono, toWav16kMono } from "@/lib/speech/transcode";
import { scoreSpeaking, taskTypeFor } from "@/lib/speech/speechsuper";
import { scoreWriting, type WritingTaskType } from "@/lib/writing/gemini";
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
 * APIs start being throttled or the S3 downloads crowd each other out.
 */
const SCORING_CONCURRENCY = 6;

/** Shape both scorers report back, so callers can tell the user what happened. */
export type ScoreRunResult = { scored: number; failed: number };

export async function scoreAttemptSpeakingFor(
  userId: string,
  attemptId: string,
): Promise<ScoreRunResult> {
  const rows = await db
    .select()
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
      ),
    );
  if (rows.length === 0) return { scored: 0, failed: 0 };

  const prompts = await resolvePrompts(rows);

  // Answers are scored TOGETHER, not one after another. Each call is a ~9s round
  // trip, so a seven-question Part 1 done in sequence made a candidate wait over
  // a minute; in parallel the whole set lands in roughly the slowest single call.
  // Each row is also written to the database the moment its own score arrives,
  // rather than after the batch, so the report fills in as results come back.
  const outcomes = await mapWithConcurrency(rows, SCORING_CONCURRENCY, (row) =>
    // ISOLATED PER ANSWER. mapWithConcurrency propagates a throw, as a
    // general-purpose primitive should — but here that would abandon every
    // answer still queued behind the one that failed. A database blip on
    // question 3 must not cost questions 4 to 7 their bands, so each is
    // contained and simply reported as unscored.
    scoreOne(row).catch(() => false),
  );

  const scored = outcomes.filter(Boolean).length;
  return { scored, failed: outcomes.length - scored };

  async function scoreOne(row: (typeof rows)[number]): Promise<boolean> {
    const key = row.audioUrl ? keyFromUrl(row.audioUrl) : null;
    if (!key) return false;

    const raw = await downloadSpeakingAudio(key);
    if (!raw) return false;

    // Recordings are normalised on the way IN and stored as 16 kHz mono WAV, so
    // the stored bytes go straight to the scorer. The transcode path remains for
    // rows written before that changed, whose objects are still WebM — and
    // SpeechSuper rejects those by returning band 0 with an empty transcript
    // rather than erroring, so guessing is not an option.
    const wav = isWav16kMono(raw)
      ? ({ ok: true, wav: Buffer.from(raw) } as const)
      : await toWav16kMono(raw);
    if (!wav.ok) return false;

    // Deliberately NOT falling back to the question type's generic instruction.
    // relevance is scored against whatever we send, so a blurb like "Answer
    // questions about yourself" marks an on-topic answer as off-topic. Omitted,
    // SpeechSuper defaults relevance to 100 — the honest result when we can't
    // tell the scorer what was asked.
    const questionPrompt = prompts.get(row.id)?.prompt ?? undefined;

    const result = await scoreSpeaking({
      audio: wav.wav,
      audioType: "wav",
      sampleRate: 16000,
      userId,
      taskType: taskTypeFor(row.questionType as QuestionTypeKey),
      questionPrompt,
    });
    if (!result.ok) return false;

    const s = result.score;
    await db
      .update(userResponses)
      .set({
        band: s.overall.toFixed(1),
        transcript: s.transcription,
        aiFeedback: {
          criteria: {
            fluencyCoherence: s.fluencyCoherence,
            lexicalResource: s.lexicalResource,
            grammar: s.grammar,
            pronunciation: s.pronunciation,
          },
          relevance: s.relevance,
          speed: s.speed,
          // The measurements behind the bands — what makes a low score
          // explainable rather than just a number.
          stats: s.stats,
          // Null unless the scorer flagged the take (empty / off-topic). Review
          // needs it to explain a low band the candidate won't recognise.
          warning: s.warning,
          // Records whether relevance is meaningful: with no prompt it is a
          // default 100, not a measurement.
          promptKnown: Boolean(questionPrompt),
          provider: "speechsuper:speak.eval.pro",
        },
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
    .select()
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
    // instruction: Gemini is told what task it is grading and cannot produce a
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
          overallFeedback: s.overallFeedback,
          criteria: s.criteria,
          corrections: s.corrections,
          improvedExamples: s.improvedExamples,
          nextSteps: s.nextSteps,
          provider: "gemini",
        },
      })
      .where(eq(userResponses.id, row.id));
    return true;
  }
}
