"use server";

import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { userResponses } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { openSection } from "@/lib/practice-sections";
import { QUESTION_TYPES, isObjective, type QuestionTypeKey } from "@/lib/ielts";
import { gradeMarks } from "@/lib/grading";
import { guardGeneral } from "@/lib/security/rate-guard";
import { scheduleAttemptScoring } from "@/lib/scoring/background";

/** Answers arrive keyed by exam number — the only id a jsonb item has. */
type AnswerMap = Record<string, Record<string, unknown>>;

export type SectionItemResult = {
  n: number;
  /** Marks this item carries — 2 for a paired "Choose TWO letters". */
  marks: number;
  questionType: string;
  isCorrect: boolean | null; // null = AI-scored (writing / speaking)
  /**
   * Marks actually earned. Differs from `isCorrect` for a paired "choose TWO"
   * item, where one right letter of two earns 1 of 2 and `isCorrect` is false.
   */
  earned: number;
  correctAnswer: unknown;
  your: unknown;
  explanation: string | null;
};

export type SectionPracticeResult = {
  attemptId: string;
  results: SectionItemResult[];
  correct: number;
  total: number;
  subjective: number;
};

/**
 * Grade one practice section.
 *
 * The answer key lives in the section's jsonb and is read here, server-side —
 * the client is sent a redacted copy (see toClientSection), so a submitted
 * answer is the only thing it can tell us. Marks are per item: one gap, one
 * mark, exactly as the answer sheet works.
 */
export async function submitSectionPractice(
  sectionId: string,
  answers: AnswerMap,
): Promise<SectionPracticeResult> {
  const user = await requireUser();
  await guardGeneral(user.id);

  const section = await openSection(sectionId);
  if (!section) throw new Error("Section not found");

  const attemptId = randomUUID();
  const results: SectionItemResult[] = [];
  const rows: (typeof userResponses.$inferInsert)[] = [];

  for (const group of section.questions.groups) {
    const meta = QUESTION_TYPES[group.questionType as QuestionTypeKey];

    for (const item of group.items) {
      const ans = answers[String(item.n)];
      const ca = (item.answer as Record<string, unknown> | undefined) ?? null;
      // A paired "Choose TWO letters" is one selection worth two marks.
      const marks = item.marks ?? 1;

      let isCorrect: boolean | null = null;
      let earned = 0;
      if (meta && isObjective(meta.family) && ca) {
        earned = gradeMarks(meta.family, ans, ca, marks);
        // "Correct" means fully correct; a half-marked pair is not.
        isCorrect = earned === marks;
      }

      // Only what was actually attempted is persisted. Writing a row for every
      // untouched gap would count it as practised and drag the dashboard's
      // accuracy down for questions nobody tried.
      if (ans) {
        rows.push({
          userId: user.id,
          // No uuid to point at: the item lives in the section's jsonb, so the
          // section id plus the exam number is its identity.
          questionId: null,
          setId: section.id,
          questionNumber: item.n,
          attemptId,
          section: section.sectionType,
          questionType: group.questionType as QuestionTypeKey,
          module: user.targetModule,
          response: ans,
          audioUrl: typeof ans.audioUrl === "string" ? ans.audioUrl : null,
          isCorrect,
          rawScore: isCorrect === null ? null : earned,
          band: null,
        });
      }

      results.push({
        n: item.n,
        marks,
        questionType: group.questionType,
        isCorrect,
        earned,
        correctAnswer: ca,
        your: ans ?? null,
        explanation: item.explanation ?? null,
      });
    }
  }

  if (rows.length > 0) {
    await db.insert(userResponses).values(rows);
    // Writing and Speaking sections had NO scoring path at all: rows were
    // written with band=null and nothing ever filled them in, while the result
    // card claimed the answers had been "AI-scored". Same background run the
    // question-practice path uses; a no-op for reading and listening.
    scheduleAttemptScoring(user.id, attemptId);
  }

  const answered = results.filter((r) => answers[String(r.n)]);
  const objective = answered.filter((r) => r.isCorrect !== null);
  const sum = (rs: SectionItemResult[]) => rs.reduce((t, r) => t + r.marks, 0);
  return {
    attemptId,
    results,
    // Marks, not items: a paired MCQ is one input but two marks, so counting
    // rows would report a full listening paper as 38 rather than 40. Summing
    // EARNED marks rather than fully-correct items is what credits a half-right
    // pair with its one mark.
    correct: objective.reduce((t, r) => t + r.earned, 0),
    total: sum(objective),
    subjective: sum(answered) - sum(objective),
  };
}

