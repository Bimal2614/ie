"use server";

import { and, asc, eq, count, sql } from "drizzle-orm";
import { db } from "@/db";
import { questionSets, questions, userResponses } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import type { SectionKey, QuestionTypeKey } from "@/lib/ielts";
import type { SetLayout } from "@/lib/question-content";

/* ------------------------------------------------------------------ *
 * IELTS Set-Based Loading
 *
 * Unlike PTE (1 question per screen), IELTS shows one passage/audio
 * with 3–6 questions tied to it. Navigation is set-by-set.
 * ------------------------------------------------------------------ */

export type SetQuestion = {
  id: string;
  questionType: QuestionTypeKey;
  prompt: string | null;
  content: Record<string, unknown> | null;
  wordLimitMin: number | null;
  prepSeconds: number | null;
  speakSeconds: number | null;
  orderIndex: number;
  marks: number;
};

export type PaginatedSet = {
  id: string;
  title: string;
  instructions: string | null;
  section: SectionKey;
  questionType: QuestionTypeKey;
  module: string;
  passageText: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  /** Shared structure the questions live in (table, summary, heading list…). */
  layout: SetLayout | null;
  /** Exam number of this set's first question. */
  startNumber: number;
  estimatedMinutes: number | null;
  questions: SetQuestion[];
};

export type PaginatedSetResult = {
  set: PaginatedSet | null;
  totalSets: number;
  currentSetIndex: number; // 0-indexed
  totalQuestions: number;  // across all sets
  hasNextSet: boolean;
  hasPreviousSet: boolean;
};

/**
 * Fetch one complete set (passage + all its questions) at a time.
 * `setPage` is 1-indexed.
 */
export async function getSetPaginated(
  section: string,
  questionType: string,
  setPage: number = 1,
): Promise<PaginatedSetResult> {
  await requireUser();

  const matches = and(
    eq(questionSets.section, section as SectionKey),
    eq(questionSets.questionType, questionType as QuestionTypeKey),
    eq(questionSets.isActive, true),
  );

  // How many sets, and how many questions across them — one grouped pass rather
  // than pulling every row back to count it.
  const [totals] = await db
    .select({
      totalSets: sql<number>`count(distinct ${questionSets.id})`,
      totalQuestions: count(questions.id),
    })
    .from(questionSets)
    .leftJoin(questions, and(eq(questions.setId, questionSets.id), eq(questions.isActive, true)))
    .where(matches);

  const totalSets = Number(totals?.totalSets ?? 0);
  if (totalSets === 0) {
    return { set: null, totalSets: 0, currentSetIndex: 0, totalQuestions: 0, hasNextSet: false, hasPreviousSet: false };
  }

  // Clamp before the query so OFFSET can never run off the end.
  const safeIndex = Math.max(0, Math.min(setPage - 1, totalSets - 1));

  // Fetch ONLY the requested set. This used to select every matching set —
  // passage text and all — and throw away all but one in JS.
  const [currentSet] = await db
    .select({
      id: questionSets.id,
      title: questionSets.title,
      instructions: questionSets.instructions,
      section: questionSets.section,
      questionType: questionSets.questionType,
      module: questionSets.module,
      passageText: questionSets.passageText,
      audioUrl: questionSets.audioUrl,
      imageUrl: questionSets.imageUrl,
      layout: questionSets.layout,
      startNumber: questionSets.startNumber,
      estimatedMinutes: questionSets.estimatedMinutes,
    })
    .from(questionSets)
    // id breaks ties so paging is stable when two sets share a createdAt.
    .where(matches)
    .orderBy(asc(questionSets.createdAt), asc(questionSets.id))
    .limit(1)
    .offset(safeIndex);

  if (!currentSet) {
    return { set: null, totalSets, currentSetIndex: safeIndex, totalQuestions: 0, hasNextSet: false, hasPreviousSet: false };
  }

  const qs = await db
    .select({
      id: questions.id,
      questionType: questions.questionType,
      prompt: questions.prompt,
      content: questions.content,
      wordLimitMin: questions.wordLimitMin,
      prepSeconds: questions.prepSeconds,
      speakSeconds: questions.speakSeconds,
      orderIndex: questions.orderIndex,
      marks: questions.marks,
    })
    .from(questions)
    .where(and(eq(questions.setId, currentSet.id), eq(questions.isActive, true)))
    .orderBy(questions.orderIndex);

  const total = Number(totals?.totalQuestions ?? 0);

  return {
    set: {
      id: currentSet.id,
      title: currentSet.title,
      instructions: currentSet.instructions,
      section: currentSet.section as SectionKey,
      questionType: currentSet.questionType as QuestionTypeKey,
      module: currentSet.module,
      passageText: currentSet.passageText,
      audioUrl: currentSet.audioUrl,
      imageUrl: currentSet.imageUrl,
      layout: (currentSet.layout as SetLayout | null) ?? null,
      startNumber: currentSet.startNumber,
      estimatedMinutes: currentSet.estimatedMinutes,
      questions: qs.map((q) => ({
        id: q.id,
        questionType: q.questionType as QuestionTypeKey,
        prompt: q.prompt,
        content: q.content as Record<string, unknown> | null,
        wordLimitMin: q.wordLimitMin,
        prepSeconds: q.prepSeconds,
        speakSeconds: q.speakSeconds,
        orderIndex: q.orderIndex,
        marks: q.marks,
      })),
    },
    totalSets,
    currentSetIndex: safeIndex,
    totalQuestions: Number(total),
    hasNextSet: safeIndex < totalSets - 1,
    hasPreviousSet: safeIndex > 0,
  };
}

/* ------------------------------------------------------------------ *
 * Submitting a set lives in ./practice.ts
 *
 * There used to be a `submitSetAnswers` here doing the same job as
 * `submitPractice` there, and the pair drifted: one counted a paired "Choose
 * TWO letters" as one mark, the other as two. Both set routes now call the one
 * action.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * getAttemptedSets — which set indices the user has already completed
 * ------------------------------------------------------------------ */

export async function getAttemptedSets(
  section: string,
  questionType: string,
): Promise<{ setIndices: number[] }> {
  const user = await requireUser();

  // One query: number the sets in paging order, keep those the user has
  // answered. Previously this pulled every set AND every response for the type
  // and intersected them in JS — two unbounded reads to produce a few integers.
  const rows = await db.execute<{ idx: number }>(sql`
    WITH ordered AS (
      SELECT id,
             (row_number() OVER (ORDER BY created_at, id) - 1)::int AS idx
      FROM ${questionSets}
      WHERE section = ${section}
        AND question_type = ${questionType}
        AND is_active = true
    )
    SELECT DISTINCT o.idx
    FROM ordered o
    JOIN ${userResponses} r ON r.set_id = o.id
    WHERE r.user_id = ${user.id}
    ORDER BY o.idx
  `);

  return { setIndices: rows.map((r) => Number(r.idx)) };
}
