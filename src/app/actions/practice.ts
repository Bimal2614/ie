"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questions as questionsT, questionSets, userResponses } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { QUESTION_TYPES, isObjective, type QuestionTypeKey } from "@/lib/ielts";
import { grade } from "@/lib/grading";
import { guardGeneral } from "@/lib/security/rate-guard";

/**
 * The ONE way a set of practice answers is graded and recorded.
 *
 * Both set routes go through here — `/practice/set/[id]` and the paginated
 * `/practice/[section]/[type]` player. They used to have an action each, doing
 * the same job with small divergences, and that is exactly how a scoring bug
 * lived in one of them and not the other: one counted a paired "Choose TWO
 * letters" as a single mark while the other counted two. One path, one answer.
 *
 * Section-wise practice has its own action (`submitSectionPractice`) because its
 * items live in a jsonb column and are identified by exam number rather than by
 * row id. The grading unit and the marks arithmetic are deliberately identical.
 */

// Loosely-typed because answer shape varies per question family. Values are
// stored as-is into the `response` jsonb, so the size guard below matters.
type AnswerMap = Record<string, Record<string, unknown>>;

/** Refuses a payload no legitimate set could produce. */
const MAX_ANSWER_KEYS = 200;
const MAX_ANSWER_BYTES = 256 * 1024;

export type QuestionResult = {
  questionId: string;
  isCorrect: boolean | null; // null = subjective (writing/speaking)
  /** A paired "Choose TWO letters" is one input worth two marks. */
  marks: number;
  correctAnswer: unknown;
  your: unknown;
  explanation: string | null;
};

export type PracticeResult = {
  setId: string;
  /** Groups this submit's rows — lets the caller kick off AI scoring for it. */
  attemptId: string;
  results: QuestionResult[];
  /** Marks earned. */
  correct: number;
  /**
   * Marks available across EVERY objective question in the set, answered or
   * not. Leaving a question blank scores zero on test day, so the denominator
   * is the paper's, not "however many the candidate got round to".
   */
  total: number;
  /** Marks sent for AI band scoring (writing/speaking). */
  subjective: number;
  /** Marks the candidate actually attempted — lets the UI say "7 of 10 answered". */
  attempted: number;
};

/** Kept for the paginated player, which imported this name from questions.ts. */
export type SetSubmissionResult = PracticeResult;

export async function submitPractice(
  setId: string,
  answers: AnswerMap,
  timeSpentSec?: number,
): Promise<PracticeResult> {
  const user = await requireUser();
  await guardGeneral(user.id);

  const keys = Object.keys(answers ?? {});
  if (keys.length > MAX_ANSWER_KEYS) throw new Error("Too many answers in one submit");
  if (JSON.stringify(answers ?? {}).length > MAX_ANSWER_BYTES) {
    throw new Error("Answer payload too large");
  }

  // One indexed round trip. Joined to the set so a deactivated set stops
  // accepting submissions — `questions.is_active` alone would still grade a
  // set an admin has pulled.
  const qs = await db
    .select({
      id: questionsT.id,
      section: questionsT.section,
      questionType: questionsT.questionType,
      correctAnswer: questionsT.correctAnswer,
      explanation: questionsT.explanation,
      marks: questionsT.marks,
    })
    .from(questionsT)
    .innerJoin(questionSets, eq(questionSets.id, questionsT.setId))
    .where(
      and(
        eq(questionsT.setId, setId),
        eq(questionsT.isActive, true),
        eq(questionSets.isActive, true),
      ),
    )
    .orderBy(questionsT.orderIndex);

  if (qs.length === 0) throw new Error("Set not found");

  // One id for the whole submit, so history can show "3 / 4 correct" instead of
  // four unrelated one-question attempts.
  const attemptId = randomUUID();
  const results: QuestionResult[] = [];
  const rows: (typeof userResponses.$inferInsert)[] = [];
  let correct = 0;
  let total = 0;
  let subjective = 0;
  let attempted = 0;

  for (const q of qs) {
    const meta = QUESTION_TYPES[q.questionType as QuestionTypeKey];
    const ans = answers?.[q.id];
    const ca = (q.correctAnswer as Record<string, unknown>) ?? null;
    const objective = Boolean(meta && isObjective(meta.family) && ca);

    // Graded whether or not it was answered: an unanswered gap is wrong, not
    // excluded. Only ANSWERED rows are persisted, though — see below.
    const isCorrect = objective ? grade(meta!.family, ans, ca!) : null;

    if (objective) {
      total += q.marks;
      if (isCorrect) correct += q.marks;
    }
    if (ans) {
      attempted += q.marks;
      if (!objective) subjective += q.marks;

      rows.push({
        userId: user.id,
        questionId: q.id,
        setId,
        attemptId,
        section: q.section,
        questionType: q.questionType,
        module: user.targetModule,
        response: ans,
        // Where the recording was stored at record time. The band is NOT taken
        // from the client — it's computed server-side by scoreAttemptSpeaking.
        audioUrl: typeof ans.audioUrl === "string" ? ans.audioUrl : null,
        isCorrect,
        rawScore: isCorrect === null ? null : isCorrect ? q.marks : 0,
        timeSpentSec: timeSpentSec ? Math.round(timeSpentSec / qs.length) : null,
        band: null, // filled in by scoreAttemptSpeaking / scoreAttemptWriting
      });
    }

    results.push({
      questionId: q.id,
      isCorrect,
      marks: q.marks,
      correctAnswer: ca,
      your: ans ?? null,
      explanation: q.explanation ?? null,
    });
  }

  // One statement instead of a round trip per question, so either the whole
  // set is recorded or none of it is.
  //
  // Untouched questions are deliberately NOT written. A row per skipped gap
  // would count it as practised and drag the dashboard's accuracy down for
  // questions nobody tried — the score above already treats them as wrong.
  if (rows.length > 0) {
    await db.insert(userResponses).values(rows);
  }

  return { setId, attemptId, results, correct, total, subjective, attempted };
}
