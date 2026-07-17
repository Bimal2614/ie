"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  questionSets,
  questions as questionsT,
  mockTestSessions,
  mockTestQuestions,
  mockTestAnswers,
  mockTestResults,
} from "@/db/schema";
import { requireUser } from "@/lib/dal";
import {
  QUESTION_TYPES,
  isObjective,
  SECTION_ORDER,
  type QuestionTypeKey,
  type SectionKey,
} from "@/lib/ielts";
import { grade } from "@/lib/grading";

type AnswerMap = Record<string, Record<string, unknown>>;

/** Indicative band from a correct ratio (real IELTS uses /40 conversion tables). */
function bandFromRatio(correct: number, total: number): number | null {
  if (total === 0) return null;
  const b = Math.round((correct / total) * 9 * 2) / 2;
  return Math.min(9, Math.max(0, b));
}

/** Start a full mock: one set per section for the chosen module. */
export async function startMock(formData: FormData): Promise<void> {
  const user = await requireUser();
  const moduleArg = (formData.get("module") === "general" ? "general" : "academic") as "academic" | "general";

  const [session] = await db
    .insert(mockTestSessions)
    .values({
      userId: user.id,
      module: moduleArg,
      status: "in_progress",
      currentSection: "listening",
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    })
    .returning({ id: mockTestSessions.id });

  // Pick one set per section, then freeze the whole question list in a single
  // insert. This previously ran a statement per question, per section.
  const picked = await db
    .selectDistinctOn([questionSets.section], {
      id: questionSets.id,
      section: questionSets.section,
    })
    .from(questionSets)
    .where(
      and(
        inArray(questionSets.section, [...SECTION_ORDER]),
        eq(questionSets.isActive, true),
        inArray(questionSets.module, [moduleArg, "both"]),
      ),
    )
    .orderBy(questionSets.section, questionSets.createdAt);

  if (picked.length > 0) {
    const setIds = picked.map((s) => s.id);
    const qs = await db
      .select({ id: questionsT.id, setId: questionsT.setId })
      .from(questionsT)
      .where(and(inArray(questionsT.setId, setIds), eq(questionsT.isActive, true)))
      .orderBy(questionsT.setId, questionsT.orderIndex);

    const sectionOf = new Map(picked.map((s) => [s.id, s.section]));
    // Keep the sections in exam order regardless of how the rows came back.
    const ordered = [...qs].sort((a, b) => {
      const sa = SECTION_ORDER.indexOf(sectionOf.get(a.setId)!);
      const sb = SECTION_ORDER.indexOf(sectionOf.get(b.setId)!);
      return sa - sb;
    });

    if (ordered.length > 0) {
      await db.insert(mockTestQuestions).values(
        ordered.map((q, i) => ({
          sessionId: session.id,
          questionId: q.id,
          setId: q.setId,
          section: sectionOf.get(q.setId)!,
          orderIndex: i,
        })),
      );
    }
  }

  redirect(`/mock-test/${session.id}`);
}

/** Submit a mock: grade objective sections, store answers + a band report. */
export async function finishMock(sessionId: string, answers: AnswerMap): Promise<void> {
  const user = await requireUser();

  const [session] = await db
    .select()
    .from(mockTestSessions)
    .where(and(eq(mockTestSessions.id, sessionId), eq(mockTestSessions.userId, user.id)))
    .limit(1);
  if (!session) redirect("/mock-tests");

  const items = await db
    .select({
      questionId: questionsT.id,
      section: questionsT.section,
      questionType: questionsT.questionType,
      correctAnswer: questionsT.correctAnswer,
    })
    .from(mockTestQuestions)
    .innerJoin(questionsT, eq(mockTestQuestions.questionId, questionsT.id))
    .where(eq(mockTestQuestions.sessionId, sessionId));

  const tally: Record<SectionKey, { correct: number; total: number }> = {
    listening: { correct: 0, total: 0 },
    reading: { correct: 0, total: 0 },
    writing: { correct: 0, total: 0 },
    speaking: { correct: 0, total: 0 },
  };

  const answerRows: (typeof mockTestAnswers.$inferInsert)[] = [];

  for (const it of items) {
    const meta = QUESTION_TYPES[it.questionType as QuestionTypeKey];
    const ans = answers[it.questionId];
    const ca = (it.correctAnswer as Record<string, unknown>) ?? null;
    let isCorrect: boolean | null = null;
    if (meta && isObjective(meta.family) && ca) {
      isCorrect = grade(meta.family, ans, ca);
      const sec = it.section as SectionKey;
      tally[sec].total++;
      if (isCorrect) tally[sec].correct++;
    }
    answerRows.push({
      sessionId,
      questionId: it.questionId,
      section: it.section,
      response: ans ?? null,
      isCorrect,
      rawScore: isCorrect === null ? null : isCorrect ? 1 : 0,
    });
  }

  // A full mock is 40+ questions — one insert, not 40 sequential round trips.
  if (answerRows.length > 0) {
    await db.insert(mockTestAnswers).values(answerRows).onConflictDoNothing();
  }

  const lBand = bandFromRatio(tally.listening.correct, tally.listening.total);
  const rBand = bandFromRatio(tally.reading.correct, tally.reading.total);
  const bands = [lBand, rBand].filter((b): b is number => b !== null);
  const overall = bands.length ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2 : null;
  const s = (n: number | null) => (n === null ? null : n.toFixed(1));

  await db.insert(mockTestResults).values({
    sessionId,
    userId: user.id,
    module: session.module,
    listeningBand: s(lBand),
    readingBand: s(rBand),
    writingBand: null, // AI band scoring wired in a later phase
    speakingBand: null,
    overallBand: s(overall),
    listeningRaw: tally.listening.correct,
    readingRaw: tally.reading.correct,
    sectionBreakdown: tally,
  }).onConflictDoNothing();

  await db
    .update(mockTestSessions)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(mockTestSessions.id, sessionId));

  redirect(`/results/${sessionId}`);
}
