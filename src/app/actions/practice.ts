"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { questions as questionsT, userResponses } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { QUESTION_TYPES, isObjective, type QuestionTypeKey } from "@/lib/ielts";
import { grade } from "@/lib/grading";
import { guardGeneral } from "@/lib/security/rate-guard";

// Loosely-typed because answer shape varies per question family.
type AnswerMap = Record<string, Record<string, unknown>>;

export type QuestionResult = {
  questionId: string;
  isCorrect: boolean | null; // null = subjective (writing/speaking)
  correctAnswer: unknown;
  your: unknown;
  explanation: string | null;
};

export type PracticeResult = {
  /** Groups this submit's rows — lets the caller kick off AI scoring for it. */
  attemptId: string;
  results: QuestionResult[];
  correct: number;
  total: number; // objective questions only
  subjective: number; // writing/speaking count
};

export async function submitPractice(setId: string, answers: AnswerMap): Promise<PracticeResult> {
  const user = await requireUser();
  await guardGeneral(user.id);

  const qs = await db
    .select()
    .from(questionsT)
    .where(eq(questionsT.setId, setId))
    // Marks are reported in exam order; without this the order is whatever the
    // planner returns.
    .orderBy(questionsT.orderIndex);

  // One id for the whole submit, so history can show "3 / 4 correct" instead of
  // four unrelated one-question attempts.
  const attemptId = randomUUID();
  const results: QuestionResult[] = [];
  const rows: (typeof userResponses.$inferInsert)[] = [];

  for (const q of qs) {
    const meta = QUESTION_TYPES[q.questionType as QuestionTypeKey];
    const ans = answers[q.id];
    const ca = (q.correctAnswer as Record<string, unknown>) ?? null;

    let isCorrect: boolean | null = null;
    if (meta && isObjective(meta.family) && ca) {
      isCorrect = grade(meta.family, ans, ca);
    }

    // Only persist what was actually answered — matching submitSetAnswers.
    // Writing a row for every untouched question would count it as attempted
    // and drag the dashboard's accuracy down for questions nobody tried.
    if (ans) {
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
        rawScore: isCorrect === null ? null : isCorrect ? 1 : 0,
        band: null, // filled in by scoreAttemptSpeaking after submit
      });
    }

    results.push({
      questionId: q.id,
      isCorrect,
      correctAnswer: ca,
      your: ans ?? null,
      explanation: q.explanation ?? null,
    });
  }

  // One statement instead of a round trip per question.
  if (rows.length > 0) {
    await db.insert(userResponses).values(rows);
  }

  const answered = results.filter((r) => answers[r.questionId]);
  const objective = answered.filter((r) => r.isCorrect !== null);
  return {
    attemptId,
    results,
    correct: objective.filter((r) => r.isCorrect).length,
    total: objective.length,
    subjective: answered.length - objective.length,
  };
}
