"use server";

import { and, asc, desc, eq, inArray, isNull, isNotNull } from "drizzle-orm";
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
  SECTIONS,
  type QuestionTypeKey,
  type SectionKey,
} from "@/lib/ielts";
import type { SetLayout } from "@/lib/question-content";
import { grade } from "@/lib/grading";
import { downloadSpeakingAudio, keyFromUrl } from "@/lib/speech/s3";
import { toWav16kMono } from "@/lib/speech/transcode";
import { scoreSpeaking, taskTypeFor } from "@/lib/speech/speechsuper";

type AnswerMap = Record<string, Record<string, unknown>>;

/** Seconds allowed for a section — the real exam clock. */
function sectionSeconds(section: SectionKey): number {
  return SECTIONS[section].durationMin * 60;
}

/**
 * The ordered sections a session actually serves, derived from its frozen
 * question set. startMock picks one set per section, so this is the exam order
 * filtered to sections that have content.
 */
async function sessionSectionOrder(sessionId: string): Promise<SectionKey[]> {
  const rows = await db
    .selectDistinct({ section: mockTestQuestions.section })
    .from(mockTestQuestions)
    .where(eq(mockTestQuestions.sessionId, sessionId));
  const present = new Set(rows.map((r) => r.section as SectionKey));
  return SECTION_ORDER.filter((s) => present.has(s));
}

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
      currentSectionIndex: 0,
      // The first section's clock starts now, server-side.
      currentSectionEndsAt: new Date(Date.now() + sectionSeconds("listening") * 1000),
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

      // Anchor the clock to the section actually served first (not an assumed
      // "listening"), in case a module lacks a section's content.
      const first = SECTION_ORDER.find((s) => [...sectionOf.values()].includes(s));
      if (first && first !== "listening") {
        await db
          .update(mockTestSessions)
          .set({
            currentSection: first,
            currentSectionEndsAt: new Date(Date.now() + sectionSeconds(first) * 1000),
          })
          .where(eq(mockTestSessions.id, session.id));
      }
    }
  }

  redirect(`/mock-test/${session.id}`);
}

/** Submit a mock: grade objective sections, store answers + a band report. */
export async function finishMock(
  sessionId: string,
  answers: AnswerMap,
  timings: Record<string, number> = {},
): Promise<void> {
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
      // Recording location captured at record time. The band is NEVER taken
      // from the client — it's computed server-side by scoreMockSpeaking.
      audioUrl: typeof ans?.audioUrl === "string" ? ans.audioUrl : null,
      isCorrect,
      rawScore: isCorrect === null ? null : isCorrect ? 1 : 0,
      timeSpentSec: timings[it.questionId] ?? null,
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

/* ------------------------------------------------------------------ *
 * Reads for the player and the results page
 * ------------------------------------------------------------------ */

export type MockSectionData = {
  section: SectionKey;
  set: {
    id: string;
    title: string;
    instructions: string | null;
    section: SectionKey;
    questionType: QuestionTypeKey;
    passageText: string | null;
    audioUrl: string | null;
    imageUrl: string | null;
    layout: SetLayout | null;
    startNumber: number;
  };
  questions: {
    id: string;
    questionType: QuestionTypeKey;
    prompt: string | null;
    content: Record<string, unknown> | null;
    wordLimitMin: number | null;
    prepSeconds: number | null;
    speakSeconds: number | null;
  }[];
};

export type MockSessionData = {
  id: string;
  module: "academic" | "general";
  status: "in_progress" | "completed" | "abandoned" | "expired";
  sections: MockSectionData[];
  /** Where to resume: index into `sections`. */
  currentSectionIndex: number;
  /** Seconds left on the current section, computed server-side from the deadline. */
  remainingSeconds: number;
  /** Autosaved answers, keyed by question id. */
  draftAnswers: Record<string, unknown>;
  /** Accumulated focus seconds per question id. */
  draftTimings: Record<string, number>;
};

/**
 * Load a session's frozen question set, grouped by section in exam order.
 *
 * The selection was frozen at startMock, so we read mock_test_questions (not
 * the live pool) — a session always shows exactly what it was served, even if
 * the underlying content later changes. startMock picks one set per section,
 * so each section maps to a single stimulus.
 */
export async function getMockSession(sessionId: string): Promise<MockSessionData | null> {
  const user = await requireUser();

  const [session] = await db
    .select()
    .from(mockTestSessions)
    .where(and(eq(mockTestSessions.id, sessionId), eq(mockTestSessions.userId, user.id)))
    .limit(1);
  if (!session) return null;

  const rows = await db
    .select({ q: questionsT, s: questionSets, order: mockTestQuestions.orderIndex })
    .from(mockTestQuestions)
    .innerJoin(questionsT, eq(mockTestQuestions.questionId, questionsT.id))
    .innerJoin(questionSets, eq(mockTestQuestions.setId, questionSets.id))
    .where(eq(mockTestQuestions.sessionId, sessionId))
    .orderBy(asc(mockTestQuestions.orderIndex));

  // Group into sections in canonical exam order, one set each.
  const bySection = new Map<SectionKey, MockSectionData>();
  for (const row of rows) {
    const sec = row.q.section as SectionKey;
    if (!bySection.has(sec)) {
      bySection.set(sec, {
        section: sec,
        set: {
          id: row.s.id,
          title: row.s.title,
          instructions: row.s.instructions,
          section: sec,
          questionType: row.s.questionType as QuestionTypeKey,
          passageText: row.s.passageText,
          audioUrl: row.s.audioUrl,
          imageUrl: row.s.imageUrl,
          layout: (row.s.layout as SetLayout | null) ?? null,
          startNumber: row.s.startNumber,
        },
        questions: [],
      });
    }
    bySection.get(sec)!.questions.push({
      id: row.q.id,
      questionType: row.q.questionType as QuestionTypeKey,
      prompt: row.q.prompt,
      content: row.q.content as Record<string, unknown> | null,
      wordLimitMin: row.q.wordLimitMin,
      prepSeconds: row.q.prepSeconds,
      speakSeconds: row.q.speakSeconds,
    });
  }

  const sections = SECTION_ORDER.map((s) => bySection.get(s)).filter(
    (s): s is MockSectionData => s !== undefined,
  );

  // Resume: how much of the current section's clock is left, from the
  // server-held deadline — not the client, which could be tampered with.
  const endsAt = session.currentSectionEndsAt?.getTime() ?? 0;
  const remainingSeconds = Math.max(0, Math.round((endsAt - Date.now()) / 1000));

  return {
    id: session.id,
    module: session.module,
    status: session.status,
    sections,
    currentSectionIndex: Math.min(session.currentSectionIndex, Math.max(0, sections.length - 1)),
    remainingSeconds,
    draftAnswers: (session.draftAnswers as Record<string, unknown>) ?? {},
    draftTimings: (session.draftTimings as Record<string, number>) ?? {},
  };
}

/**
 * Autosave in-progress work. Called on a debounce from the player so a resumed
 * session restores answers and per-question timings. Owner-scoped; a no-op on a
 * session that isn't the caller's or is already finished.
 */
export async function saveMockProgress(
  sessionId: string,
  answers: Record<string, unknown>,
  timings: Record<string, number>,
): Promise<void> {
  const user = await requireUser();
  await db
    .update(mockTestSessions)
    .set({ draftAnswers: answers, draftTimings: timings })
    .where(
      and(
        eq(mockTestSessions.id, sessionId),
        eq(mockTestSessions.userId, user.id),
        eq(mockTestSessions.status, "in_progress"),
      ),
    );
}

/**
 * Move to a section and (re)arm its clock server-side. The new deadline is set
 * here, not by the client, so the timer is authoritative. Returns the fresh
 * deadline in seconds so the player can sync immediately.
 */
export async function advanceMockSection(
  sessionId: string,
  toIndex: number,
  answers: Record<string, unknown>,
  timings: Record<string, number>,
): Promise<{ sectionIndex: number; remainingSeconds: number } | null> {
  const user = await requireUser();

  const order = await sessionSectionOrder(sessionId);
  if (order.length === 0) return null;
  const clamped = Math.max(0, Math.min(toIndex, order.length - 1));
  const section = order[clamped];
  const seconds = sectionSeconds(section);

  const res = await db
    .update(mockTestSessions)
    .set({
      currentSection: section,
      currentSectionIndex: clamped,
      currentSectionEndsAt: new Date(Date.now() + seconds * 1000),
      draftAnswers: answers,
      draftTimings: timings,
    })
    .where(
      and(
        eq(mockTestSessions.id, sessionId),
        eq(mockTestSessions.userId, user.id),
        eq(mockTestSessions.status, "in_progress"),
      ),
    )
    .returning({ id: mockTestSessions.id });

  if (res.length === 0) return null;
  return { sectionIndex: clamped, remainingSeconds: seconds };
}

export type MockResultData = {
  sessionId: string;
  module: "academic" | "general";
  completedAt: Date | null;
  overallBand: string | null;
  bands: { section: SectionKey; band: string | null; raw: number | null; total: number | null }[];
};

/**
 * Score a finished mock's speaking answers and fold the result into the report.
 *
 * Runs after the mock is submitted, not inline: each SpeechSuper call takes
 * several seconds, so scoring a whole speaking section would stall the submit.
 * The report shows "awaiting AI band score" until this fills it in.
 *
 * Idempotent — only rows with a recording and no band are scored, so a retry or
 * a second page load can't double-charge the API or overwrite a band.
 */
export async function scoreMockSpeaking(sessionId: string): Promise<{ scored: number }> {
  const user = await requireUser();

  const [session] = await db
    .select({ id: mockTestSessions.id })
    .from(mockTestSessions)
    .where(and(eq(mockTestSessions.id, sessionId), eq(mockTestSessions.userId, user.id)))
    .limit(1);
  if (!session) return { scored: 0 };

  const rows = await db
    .select({ a: mockTestAnswers, q: questionsT })
    .from(mockTestAnswers)
    .innerJoin(questionsT, eq(mockTestAnswers.questionId, questionsT.id))
    .where(
      and(
        eq(mockTestAnswers.sessionId, sessionId),
        eq(mockTestAnswers.section, "speaking"),
        isNull(mockTestAnswers.band),
        isNotNull(mockTestAnswers.audioUrl),
      ),
    );

  let scored = 0;
  const bands: number[] = [];

  for (const row of rows) {
    const key = row.a.audioUrl ? keyFromUrl(row.a.audioUrl) : null;
    if (!key) continue;
    const raw = await downloadSpeakingAudio(key);
    if (!raw) continue;

    // Browsers record WebM; SpeechSuper needs WAV 16k mono.
    const wav = await toWav16kMono(raw);
    if (!wav.ok) continue;

    const meta = QUESTION_TYPES[row.q.questionType as QuestionTypeKey];
    const res = await scoreSpeaking({
      audio: wav.wav,
      audioType: "wav",
      sampleRate: 16000,
      userId: user.id,
      taskType: taskTypeFor(row.q.questionType as QuestionTypeKey),
      questionPrompt: row.q.prompt ?? meta?.instruction,
    });
    if (!res.ok) continue;

    const s = res.score;
    bands.push(s.overall);
    await db
      .update(mockTestAnswers)
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
          provider: "speechsuper:speak.eval.pro",
        },
      })
      .where(eq(mockTestAnswers.id, row.a.id));
    scored++;
  }

  if (bands.length > 0) {
    // The section band is the mean of its answers, rounded to the nearest half
    // band — the IELTS convention.
    const mean = bands.reduce((a, b) => a + b, 0) / bands.length;
    const speakingBand = Math.round(mean * 2) / 2;
    await recomputeOverall(sessionId, speakingBand);
  }

  return { scored };
}

/** Re-average the report now that a section band exists. */
async function recomputeOverall(sessionId: string, speakingBand: number): Promise<void> {
  const [result] = await db
    .select()
    .from(mockTestResults)
    .where(eq(mockTestResults.sessionId, sessionId))
    .limit(1);
  if (!result) return;

  const present = [result.listeningBand, result.readingBand, result.writingBand]
    .map((b) => (b === null ? null : Number(b)))
    .filter((b): b is number => b !== null);
  present.push(speakingBand);

  const overall =
    present.length > 0
      ? Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 2) / 2
      : null;

  await db
    .update(mockTestResults)
    .set({
      speakingBand: speakingBand.toFixed(1),
      overallBand: overall === null ? null : overall.toFixed(1),
    })
    .where(eq(mockTestResults.sessionId, sessionId));
}

/* ------------------------------------------------------------------ *
 * Per-section review — the results drill-down
 * ------------------------------------------------------------------ */

export type MockReviewItem = {
  questionId: string;
  number: number;
  prompt: string | null;
  content: unknown;
  correctAnswer: unknown;
  explanation: string | null;
  response: unknown;
  isCorrect: boolean | null;
  band: string | null;
  timeSpentSec: number | null;
};

export type MockSectionReview = {
  section: SectionKey;
  questionType: QuestionTypeKey;
  set: {
    title: string;
    instructions: string | null;
    passageText: string | null;
    audioUrl: string | null;
    imageUrl: string | null;
    layout: SetLayout | null;
    startNumber: number;
  } | null;
  items: MockReviewItem[];
};

/**
 * One section of a finished mock, with the candidate's answers and verdicts —
 * feeds the click-through: skill → its questions → each question in full.
 * Owner-scoped; reads the frozen answers, not the live pool.
 */
export async function getMockSectionReview(
  sessionId: string,
  section: SectionKey,
): Promise<MockSectionReview | null> {
  const user = await requireUser();

  // Guard: the session must belong to the caller.
  const [session] = await db
    .select({ id: mockTestSessions.id })
    .from(mockTestSessions)
    .where(and(eq(mockTestSessions.id, sessionId), eq(mockTestSessions.userId, user.id)))
    .limit(1);
  if (!session) return null;

  const rows = await db
    .select({ a: mockTestAnswers, q: questionsT, s: questionSets })
    .from(mockTestAnswers)
    .innerJoin(questionsT, eq(mockTestAnswers.questionId, questionsT.id))
    .leftJoin(questionSets, eq(questionsT.setId, questionSets.id))
    .where(and(eq(mockTestAnswers.sessionId, sessionId), eq(mockTestAnswers.section, section)))
    .orderBy(asc(questionsT.orderIndex));

  if (rows.length === 0) return null;

  const s = rows[0].s;
  const set = s
    ? {
        title: s.title,
        instructions: s.instructions,
        passageText: s.passageText,
        audioUrl: s.audioUrl,
        imageUrl: s.imageUrl,
        layout: (s.layout as SetLayout | null) ?? null,
        startNumber: s.startNumber,
      }
    : null;

  return {
    section,
    questionType: rows[0].q.questionType as QuestionTypeKey,
    set,
    items: rows.map((r) => ({
      questionId: r.q.id,
      number: (set?.startNumber ?? 1) + r.q.orderIndex,
      prompt: r.q.prompt,
      content: r.q.content,
      correctAnswer: r.q.correctAnswer,
      explanation: r.q.explanation,
      response: r.a.response,
      isCorrect: r.a.isCorrect,
      band: r.a.band,
      timeSpentSec: r.a.timeSpentSec,
    })),
  };
}

export type MockResultSummary = {
  sessionId: string;
  module: "academic" | "general";
  overallBand: string | null;
  completedAt: Date | null;
};

/** Past completed mocks for the current user, newest first. */
export async function getMockResults(): Promise<MockResultSummary[]> {
  const user = await requireUser();
  const rows = await db
    .select({
      sessionId: mockTestResults.sessionId,
      module: mockTestResults.module,
      overallBand: mockTestResults.overallBand,
      completedAt: mockTestSessions.completedAt,
    })
    .from(mockTestResults)
    .innerJoin(mockTestSessions, eq(mockTestResults.sessionId, mockTestSessions.id))
    .where(eq(mockTestResults.userId, user.id))
    .orderBy(desc(mockTestSessions.completedAt));

  return rows.map((r) => ({
    sessionId: r.sessionId,
    module: r.module,
    overallBand: r.overallBand,
    completedAt: r.completedAt,
  }));
}

export async function getMockResult(sessionId: string): Promise<MockResultData | null> {
  const user = await requireUser();

  const [row] = await db
    .select({ r: mockTestResults, completedAt: mockTestSessions.completedAt })
    .from(mockTestResults)
    .innerJoin(mockTestSessions, eq(mockTestResults.sessionId, mockTestSessions.id))
    .where(and(eq(mockTestResults.sessionId, sessionId), eq(mockTestResults.userId, user.id)))
    .limit(1);
  if (!row) return null;

  const breakdown = (row.r.sectionBreakdown ?? {}) as Record<
    string,
    { correct: number; total: number }
  >;
  const totalOf = (s: SectionKey) => breakdown[s]?.total ?? null;

  return {
    sessionId: row.r.sessionId,
    module: row.r.module,
    completedAt: row.completedAt,
    overallBand: row.r.overallBand,
    bands: [
      { section: "listening", band: row.r.listeningBand, raw: row.r.listeningRaw, total: totalOf("listening") },
      { section: "reading", band: row.r.readingBand, raw: row.r.readingRaw, total: totalOf("reading") },
      { section: "writing", band: row.r.writingBand, raw: null, total: null },
      { section: "speaking", band: row.r.speakingBand, raw: null, total: null },
    ],
  };
}
