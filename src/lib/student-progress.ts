import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { mockTestResults, userResponses } from "@/db/schema";

/**
 * One candidate's practice record — the same three questions, whoever is
 * looking.
 *
 * THIS FILE TAKES A USER ID AND ASKS NOTHING ELSE, which is why it is not in
 * src/lib/partners.ts: every read in that file is scoped by `partnerId` and has
 * to stay that way. The access check therefore belongs to the caller, and each
 * one makes it in the way that suits it — `partnerStudentDetail` with a
 * `partner_id` predicate on the student row, `adminStudentDetail` with the
 * `requireAdmin()` the whole console sits behind.
 *
 * It exists because the admin console wanted the partner panel's student screen
 * verbatim. Copying the three queries would have meant two definitions of "what
 * a section average is" drifting apart the first time either was corrected.
 */

export type SectionProgress = {
  section: "listening" | "reading" | "writing" | "speaking";
  attempts: number;
  answers: number;
  graded: number;
  correct: number;
  avgBand: number | null;
  lastAt: Date | null;
};

export type StudentAttempt = {
  attemptId: string;
  section: string;
  questionType: string;
  answers: number;
  correct: number;
  avgBand: number | null;
  at: Date;
};

export type StudentMock = {
  id: string;
  module: string;
  overallBand: string | null;
  listeningBand: string | null;
  readingBand: string | null;
  writingBand: string | null;
  speakingBand: string | null;
  at: Date;
};

export type StudentProgress = {
  sections: SectionProgress[];
  attempts: StudentAttempt[];
  mocks: StudentMock[];
};

/** How much of the feed is worth showing. Bounded, like every list on a page. */
const RECENT_ATTEMPTS = 20;
const RECENT_MOCKS = 10;

/**
 * Sections, recent practice and mock sittings, in three parallel queries.
 *
 * Served by `user_responses_user_created_idx` and `mock_results_user_idx`, both
 * of which already exist — see src/db/schema.ts.
 */
export async function studentProgress(userId: string): Promise<StudentProgress> {
  const [sections, attempts, mocks] = await Promise.all([
    db
      .select({
        section: userResponses.section,
        attempts: sql<number>`count(distinct ${userResponses.attemptId})::int`,
        answers: sql<number>`count(*)::int`,
        graded: sql<number>`count(*) filter (where ${userResponses.isCorrect} is not null or ${userResponses.band} is not null)::int`,
        correct: sql<number>`count(*) filter (where ${userResponses.isCorrect})::int`,
        avgBand: sql<number | null>`avg(${userResponses.band})::float`,
        lastAt: sql<Date | null>`max(${userResponses.createdAt})`,
      })
      .from(userResponses)
      .where(eq(userResponses.userId, userId))
      .groupBy(userResponses.section),
    // One row per SUBMIT, not per gap — a four-gap table is one thing the
    // student did, and listing its rows fills the feed with four of it.
    db
      .select({
        attemptId: userResponses.attemptId,
        section: userResponses.section,
        questionType: userResponses.questionType,
        answers: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) filter (where ${userResponses.isCorrect})::int`,
        avgBand: sql<number | null>`avg(${userResponses.band})::float`,
        at: sql<Date>`max(${userResponses.createdAt})`,
      })
      .from(userResponses)
      .where(eq(userResponses.userId, userId))
      .groupBy(userResponses.attemptId, userResponses.section, userResponses.questionType)
      .orderBy(sql`max(${userResponses.createdAt}) desc`)
      .limit(RECENT_ATTEMPTS),
    db
      .select({
        id: mockTestResults.id,
        module: mockTestResults.module,
        overallBand: mockTestResults.overallBand,
        listeningBand: mockTestResults.listeningBand,
        readingBand: mockTestResults.readingBand,
        writingBand: mockTestResults.writingBand,
        speakingBand: mockTestResults.speakingBand,
        at: mockTestResults.createdAt,
      })
      .from(mockTestResults)
      .where(eq(mockTestResults.userId, userId))
      .orderBy(desc(mockTestResults.createdAt))
      .limit(RECENT_MOCKS),
  ]);

  return { sections, attempts, mocks };
}

export type StudentTotals = {
  attempts: number;
  answers: number;
  avgBand: number | null;
  lastActiveAt: Date | null;
  mocks: number;
  bestMockBand: number | null;
};

/**
 * The lifetime figures behind the lists above.
 *
 * Separate from `studentProgress` because they are a different question: the
 * lists are bounded at twenty and ten, so "best mock band" summed off the
 * rendered rows would quietly mean "best of the last ten".
 */
export async function studentTotals(userId: string): Promise<StudentTotals> {
  const [[practice], [mocks]] = await Promise.all([
    db
      .select({
        attempts: sql<number>`count(distinct ${userResponses.attemptId})::int`,
        answers: sql<number>`count(*)::int`,
        avgBand: sql<number | null>`avg(${userResponses.band})::float`,
        lastAt: sql<Date | null>`max(${userResponses.createdAt})`,
      })
      .from(userResponses)
      .where(eq(userResponses.userId, userId)),
    db
      .select({
        taken: sql<number>`count(*)::int`,
        // Text column, so the cast is what makes this a band and not a string
        // comparison. Bands are single-digit, so the ordering agrees either way.
        best: sql<number | null>`max(${mockTestResults.overallBand})::float`,
      })
      .from(mockTestResults)
      .where(eq(mockTestResults.userId, userId)),
  ]);

  return {
    attempts: practice?.attempts ?? 0,
    answers: practice?.answers ?? 0,
    avgBand: practice?.avgBand ?? null,
    lastActiveAt: practice?.lastAt ?? null,
    mocks: mocks?.taken ?? 0,
    bestMockBand: mocks?.best ?? null,
  };
}
