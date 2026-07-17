"use server";

import { and, eq, gte, lt, count, sql, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { userResponses, questions, questionSets } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import type { SectionKey, QuestionTypeKey } from "@/lib/ielts";
import type { SetLayout } from "@/lib/question-content";

/* ------------------------------------------------------------------ *
 * Day boundaries
 *
 * A "day" is the user's local day, but createdAt is stored in UTC. The page
 * passes a plain YYYY-MM-DD plus the browser's offset so "today" means the
 * same thing on screen as it does in the query.
 * ------------------------------------------------------------------ */

function dayBounds(date: string, tzOffsetMinutes: number): { start: Date; end: Date } {
  // Date.UTC of local midnight, pushed back by the offset to get the UTC instant.
  const [y, m, d] = date.split("-").map(Number);
  const startUtcMs = Date.UTC(y, m - 1, d) + tzOffsetMinutes * 60_000;
  return { start: new Date(startUtcMs), end: new Date(startUtcMs + 24 * 60 * 60 * 1000) };
}

/* ------------------------------------------------------------------ *
 * Day summary — stats + section → type tree
 * ------------------------------------------------------------------ */

export type TypeRow = {
  questionType: QuestionTypeKey;
  attempted: number;
  correct: number;
  /** Objective questions only — writing/speaking are graded by band. */
  graded: number;
  accuracy: number | null;
  /** Mean band for AI-scored types, once scoring is wired. */
  avgBand: number | null;
};

export type SectionRow = {
  section: SectionKey;
  attempted: number;
  correct: number;
  graded: number;
  accuracy: number | null;
  types: TypeRow[];
};

export type DaySummary = {
  date: string;
  attempted: number;
  correct: number;
  graded: number;
  accuracy: number | null;
  timeMin: number;
  sections: SectionRow[];
};

export async function getDaySummary(date: string, tzOffsetMinutes: number): Promise<DaySummary> {
  const user = await requireUser();
  const { start, end } = dayBounds(date, tzOffsetMinutes);

  const inDay = and(
    eq(userResponses.userId, user.id),
    gte(userResponses.createdAt, start),
    lt(userResponses.createdAt, end),
  );

  const rows = await db
    .select({
      section: userResponses.section,
      questionType: userResponses.questionType,
      attempted: count(),
      correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
      graded: sql<number>`count(*) filter (where ${userResponses.isCorrect} is not null)`,
      avgBand: sql<number | null>`avg(${userResponses.band})`,
      timeSec: sql<number>`coalesce(sum(${userResponses.timeSpentSec}), 0)`,
    })
    .from(userResponses)
    .where(inDay)
    .groupBy(userResponses.section, userResponses.questionType);

  const bySection = new Map<SectionKey, TypeRow[]>();
  let attempted = 0;
  let correct = 0;
  let graded = 0;
  let timeSec = 0;

  for (const r of rows) {
    const a = Number(r.attempted);
    const c = Number(r.correct);
    const g = Number(r.graded);
    attempted += a;
    correct += c;
    graded += g;
    timeSec += Number(r.timeSec);

    const list = bySection.get(r.section as SectionKey) ?? [];
    list.push({
      questionType: r.questionType as QuestionTypeKey,
      attempted: a,
      correct: c,
      graded: g,
      accuracy: g > 0 ? Math.round((c / g) * 100) : null,
      avgBand: r.avgBand === null ? null : Number(r.avgBand),
    });
    bySection.set(r.section as SectionKey, list);
  }

  const sections: SectionRow[] = [...bySection.entries()].map(([section, types]) => {
    const a = types.reduce((n, t) => n + t.attempted, 0);
    const c = types.reduce((n, t) => n + t.correct, 0);
    const g = types.reduce((n, t) => n + t.graded, 0);
    return {
      section,
      attempted: a,
      correct: c,
      graded: g,
      accuracy: g > 0 ? Math.round((c / g) * 100) : null,
      types,
    };
  });

  return {
    date,
    attempted,
    correct,
    graded,
    accuracy: graded > 0 ? Math.round((correct / graded) * 100) : null,
    timeMin: Math.round(timeSec / 60),
    sections,
  };
}

/* ------------------------------------------------------------------ *
 * Attempts for one (day, type)
 * ------------------------------------------------------------------ */

/**
 * One row per *attempt* (one submit of a set), not per question.
 *
 * A gap-backed set has no per-question prompt — the question text lives in the
 * shared table/summary — so listing rows individually showed the set title
 * repeated N times with nothing to tell them apart. "Table completion · 3/4
 * correct" is both the useful unit and the one candidates actually think in.
 */
export type AttemptRow = {
  attemptId: string;
  questionType: QuestionTypeKey;
  setTitle: string | null;
  questions: number;
  correct: number;
  graded: number;
  /** Mean band across AI-scored questions in the attempt, if any. */
  avgBand: number | null;
  createdAt: Date;
};

export async function getAttempts(
  date: string,
  tzOffsetMinutes: number,
  section: SectionKey,
  questionType: QuestionTypeKey,
): Promise<AttemptRow[]> {
  const user = await requireUser();
  const { start, end } = dayBounds(date, tzOffsetMinutes);

  const rows = await db
    .select({
      attemptId: userResponses.attemptId,
      questionType: userResponses.questionType,
      // Left join: a response outlives the set it came from, and history must
      // not vanish when content is edited.
      setTitle: questionSets.title,
      questions: count(),
      correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
      graded: sql<number>`count(*) filter (where ${userResponses.isCorrect} is not null)`,
      avgBand: sql<number | null>`avg(${userResponses.band})`,
      createdAt: sql<Date>`min(${userResponses.createdAt})`,
    })
    .from(userResponses)
    .leftJoin(questionSets, eq(userResponses.setId, questionSets.id))
    .where(
      and(
        eq(userResponses.userId, user.id),
        gte(userResponses.createdAt, start),
        lt(userResponses.createdAt, end),
        eq(userResponses.section, section),
        eq(userResponses.questionType, questionType),
      ),
    )
    .groupBy(userResponses.attemptId, userResponses.questionType, questionSets.title)
    .orderBy(asc(sql`min(${userResponses.createdAt})`));

  return rows.map((r) => ({
    attemptId: r.attemptId,
    questionType: r.questionType as QuestionTypeKey,
    setTitle: r.setTitle,
    questions: Number(r.questions),
    correct: Number(r.correct),
    graded: Number(r.graded),
    avgBand: r.avgBand === null ? null : Number(r.avgBand),
    createdAt: new Date(r.createdAt),
  }));
}

/* ------------------------------------------------------------------ *
 * One attempt in full — question, your answer, the correct answer, score
 * ------------------------------------------------------------------ */

/** One answered question within an attempt. */
export type AttemptItem = {
  responseId: string;
  /** Null once the question is deleted; review then falls back to a plain list. */
  questionId: string | null;
  /** Exam number, so a table's marks read Q23–Q26 as they did on screen. */
  number: number | null;
  isCorrect: boolean | null;
  band: string | null;
  rawScore: number | null;
  response: unknown;
  audioUrl: string | null;
  transcript: string | null;
  aiFeedback: unknown;
  /** Null when the question has since been deleted. */
  question: {
    prompt: string | null;
    content: unknown;
    correctAnswer: unknown;
    explanation: string | null;
    orderIndex: number;
    // Carried so review can re-render the question exactly as it was answered.
    wordLimitMin: number | null;
    prepSeconds: number | null;
    speakSeconds: number | null;
  } | null;
};

export type AttemptDetail = {
  attemptId: string;
  section: SectionKey;
  questionType: QuestionTypeKey;
  createdAt: Date;
  timeSpentSec: number | null;
  correct: number;
  graded: number;
  items: AttemptItem[];
  set: {
    id: string;
    title: string;
    instructions: string | null;
    passageText: string | null;
    audioUrl: string | null;
    imageUrl: string | null;
    layout: SetLayout | null;
    startNumber: number;
  } | null;
};

/** Every question answered in one submit, in exam order. */
export async function getAttemptDetail(attemptId: string): Promise<AttemptDetail | null> {
  const user = await requireUser();

  const rows = await db
    .select({ r: userResponses, q: questions, s: questionSets })
    .from(userResponses)
    // Left joins: questionId is set null when content is deleted; the attempt
    // and its score must survive that.
    .leftJoin(questions, eq(userResponses.questionId, questions.id))
    .leftJoin(questionSets, eq(userResponses.setId, questionSets.id))
    // Scoped to the owner — an attempt id must never read across users.
    .where(and(eq(userResponses.attemptId, attemptId), eq(userResponses.userId, user.id)))
    .orderBy(asc(questions.orderIndex), asc(userResponses.createdAt));

  if (rows.length === 0) return null;

  const first = rows[0];
  const s = first.s;

  const items: AttemptItem[] = rows.map((row) => ({
    responseId: row.r.id,
    questionId: row.q?.id ?? null,
    number: s && row.q ? s.startNumber + row.q.orderIndex : null,
    isCorrect: row.r.isCorrect,
    band: row.r.band,
    rawScore: row.r.rawScore,
    response: row.r.response,
    audioUrl: row.r.audioUrl,
    transcript: row.r.transcript,
    aiFeedback: row.r.aiFeedback,
    question: row.q
      ? {
          prompt: row.q.prompt,
          content: row.q.content,
          correctAnswer: row.q.correctAnswer,
          explanation: row.q.explanation,
          orderIndex: row.q.orderIndex,
          wordLimitMin: row.q.wordLimitMin,
          prepSeconds: row.q.prepSeconds,
          speakSeconds: row.q.speakSeconds,
        }
      : null,
  }));

  return {
    attemptId,
    section: first.r.section as SectionKey,
    questionType: first.r.questionType as QuestionTypeKey,
    createdAt: rows.reduce(
      (min, row) => (row.r.createdAt < min ? row.r.createdAt : min),
      first.r.createdAt,
    ),
    // timeSpentSec is stored per row as an equal share of the set's total.
    timeSpentSec: rows.every((r) => r.r.timeSpentSec === null)
      ? null
      : rows.reduce((n, r) => n + (r.r.timeSpentSec ?? 0), 0),
    correct: items.filter((i) => i.isCorrect === true).length,
    graded: items.filter((i) => i.isCorrect !== null).length,
    items,
    set: s
      ? {
          id: s.id,
          title: s.title,
          instructions: s.instructions,
          passageText: s.passageText,
          audioUrl: s.audioUrl,
          imageUrl: s.imageUrl,
          layout: (s.layout as SetLayout | null) ?? null,
          startNumber: s.startNumber,
        }
      : null,
  };
}

/** Most recent day with any activity — where History opens by default. */
export async function getLatestActiveDate(tzOffsetMinutes: number): Promise<string | null> {
  const user = await requireUser();
  const [row] = await db
    .select({
      day: sql<string>`to_char((${userResponses.createdAt} - make_interval(mins => ${tzOffsetMinutes}))::date, 'YYYY-MM-DD')`,
    })
    .from(userResponses)
    .where(eq(userResponses.userId, user.id))
    .orderBy(desc(userResponses.createdAt))
    .limit(1);
  return row?.day ?? null;
}
