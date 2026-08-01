"use server";

import { and, eq, gte, lte, count, countDistinct, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { userResponses, questions, questionSets, mockTestResults, mockTestSessions } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import type { SectionKey, QuestionTypeKey } from "@/lib/ielts";

/* ------------------------------------------------------------------ *
 * Dashboard stats — aggregates for the main dashboard
 * ------------------------------------------------------------------ */

export type DashboardStats = {
  // Today
  todayAttempted: number;
  todayCorrect: number;
  todayAccuracy: number;
  // All-time
  totalAttempted: number;
  totalCorrect: number;
  totalAccuracy: number;
  // Streak
  currentStreak: number;
  longestStreak: number;
  // Section breakdown
  sectionStats: Record<
    SectionKey,
    {
      attempted: number;
      correct: number;
      accuracy: number;
      /** Distinct questions the user has practised in this section. */
      practised: number;
      /** Total active questions available in this section. */
      available: number;
      /** practised / available, as a whole percent. */
      completion: number;
    }
  >;
  // Recent mock results
  recentMocks: Array<{
    id: string;
    module: string;
    overallBand: string | null;
    listeningBand: string | null;
    readingBand: string | null;
    writingBand: string | null;
    speakingBand: string | null;
    completedAt: Date | null;
  }>;
  // Question type breakdown
  typeStats: Array<{
    section: string;
    questionType: string;
    attempted: number;
    correct: number;
    accuracy: number;
  }>;
  /**
   * Recent activity — one entry per ATTEMPT, not per question. A 4-gap table
   * submit is one thing the user did; listing its rows individually filled the
   * feed with four identical-looking entries.
   */
  recentActivity: Array<{
    attemptId: string;
    section: string;
    questionType: string;
    setTitle: string | null;
    questions: number;
    correct: number;
    graded: number;
    avgBand: number | null;
    createdAt: Date;
  }>;
  /** The most recent thing the user practised — powers "Continue where you left off". */
  continueLast: {
    section: string;
    questionType: string;
    setTitle: string | null;
    createdAt: Date;
  } | null;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await requireUser();
  const userId = user.id;

  // Date boundaries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Every query below is independent (each only needs userId), so they run in
  // parallel: total wall time is the slowest query, not the sum of all seven.
  const [todayRows, allTimeRows, sectionRows, availableRows, streakRows, mockRows, typeRows, recentRows] =
    await Promise.all([
      // -- Today's stats --
      db
        .select({
          total: count(),
          correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
        })
        .from(userResponses)
        .where(
          and(
            eq(userResponses.userId, userId),
            gte(userResponses.createdAt, todayStart),
            lte(userResponses.createdAt, todayEnd),
          ),
        ),

      // -- All-time stats --
      db
        .select({
          total: count(),
          correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
        })
        .from(userResponses)
        .where(eq(userResponses.userId, userId)),

      // -- Section breakdown -- attempts + distinct questions practised, per section.
      db
        .select({
          section: userResponses.section,
          total: count(),
          correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
          practised: countDistinct(userResponses.questionId),
        })
        .from(userResponses)
        .where(eq(userResponses.userId, userId))
        .groupBy(userResponses.section),

      // -- Total active questions available per section (the denominator) --
      db
        .select({ section: questions.section, total: count() })
        .from(questions)
        .where(eq(questions.isActive, true))
        .groupBy(questions.section),

      // -- Streak, entirely in SQL (gaps-and-islands) --
      // Group activity into distinct UTC days, then number consecutive days: a
      // run of consecutive days shares the same (day - row_number) offset, so
      // grouping on that offset gives each streak's length in one pass. The
      // current streak is the run ending today or yesterday. Returns two
      // integers rather than rows to reduce on the client.
      db.execute<{ current_streak: number; longest_streak: number }>(sql`
        WITH days AS (
          SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::date AS d
          FROM ${userResponses}
          WHERE user_id = ${userId}
        ),
        runs AS (
          SELECT d, d - (row_number() OVER (ORDER BY d))::int AS grp
          FROM days
        ),
        streaks AS (
          SELECT count(*)::int AS len, max(d) AS last_day
          FROM runs GROUP BY grp
        )
        SELECT
          COALESCE(max(len), 0)::int AS longest_streak,
          COALESCE(max(len) FILTER (
            WHERE last_day >= (now() AT TIME ZONE 'UTC')::date - 1
          ), 0)::int AS current_streak
        FROM streaks
      `),

      // -- Recent mock results --
      db
        .select({
          id: mockTestResults.sessionId,
          module: mockTestResults.module,
          overallBand: mockTestResults.overallBand,
          listeningBand: mockTestResults.listeningBand,
          readingBand: mockTestResults.readingBand,
          writingBand: mockTestResults.writingBand,
          speakingBand: mockTestResults.speakingBand,
          completedAt: mockTestSessions.completedAt,
        })
        .from(mockTestResults)
        .innerJoin(mockTestSessions, eq(mockTestResults.sessionId, mockTestSessions.id))
        .where(eq(mockTestResults.userId, userId))
        .orderBy(desc(mockTestSessions.completedAt))
        .limit(5),

      // -- Question type breakdown --
      db
        .select({
          section: userResponses.section,
          questionType: userResponses.questionType,
          total: count(),
          correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
        })
        .from(userResponses)
        .where(eq(userResponses.userId, userId))
        .groupBy(userResponses.section, userResponses.questionType),

      // -- Recent activity: last 10 attempts, rolled up from their rows --
      db
        .select({
          attemptId: userResponses.attemptId,
          section: userResponses.section,
          questionType: userResponses.questionType,
          setTitle: questionSets.title,
          questions: count(),
          correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
          graded: sql<number>`count(*) filter (where ${userResponses.isCorrect} is not null)`,
          avgBand: sql<number | null>`avg(${userResponses.band})`,
          createdAt: sql<Date>`min(${userResponses.createdAt})`,
        })
        .from(userResponses)
        .leftJoin(questionSets, eq(userResponses.setId, questionSets.id))
        .where(eq(userResponses.userId, userId))
        .groupBy(
          userResponses.attemptId,
          userResponses.section,
          userResponses.questionType,
          questionSets.title,
        )
        .orderBy(desc(sql`min(${userResponses.createdAt})`))
        .limit(10),
    ]);

  const today = todayRows[0] ?? { total: 0, correct: 0 };
  const todayAttempted = Number(today.total);
  const todayCorrect = Number(today.correct);
  const todayAccuracy = todayAttempted > 0 ? Math.round((todayCorrect / todayAttempted) * 100) : 0;

  const allTime = allTimeRows[0] ?? { total: 0, correct: 0 };
  const totalAttempted = Number(allTime.total);
  const totalCorrect = Number(allTime.correct);
  const totalAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  const sections: SectionKey[] = ["listening", "reading", "writing", "speaking"];
  const sectionStats = Object.fromEntries(
    sections.map((s) => {
      const row = sectionRows.find((r) => r.section === s);
      const attempted = row ? Number(row.total) : 0;
      const correct = row ? Number(row.correct) : 0;
      const practised = row ? Number(row.practised) : 0;
      const available = Number(availableRows.find((r) => r.section === s)?.total ?? 0);
      const completion = available > 0 ? Math.round((practised / available) * 100) : 0;
      return [s, {
        attempted,
        correct,
        accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
        practised,
        available,
        completion,
      }];
    }),
  ) as DashboardStats["sectionStats"];

  // Streak comes back from the SQL above as two integers.
  const streakRow = streakRows[0];
  const currentStreak = Number(streakRow?.current_streak ?? 0);
  const longestStreak = Number(streakRow?.longest_streak ?? 0);

  const recentMocks = mockRows.map((r) => ({
    id: r.id,
    module: r.module,
    overallBand: r.overallBand,
    listeningBand: r.listeningBand,
    readingBand: r.readingBand,
    writingBand: r.writingBand,
    speakingBand: r.speakingBand,
    completedAt: r.completedAt,
  }));

  const typeStats = typeRows.map((r) => ({
    section: r.section,
    questionType: r.questionType,
    attempted: Number(r.total),
    correct: Number(r.correct),
    accuracy: Number(r.total) > 0 ? Math.round((Number(r.correct) / Number(r.total)) * 100) : 0,
  }));

  const recentActivity = recentRows.map((r) => ({
    attemptId: r.attemptId,
    section: r.section,
    questionType: r.questionType,
    setTitle: r.setTitle,
    questions: Number(r.questions),
    correct: Number(r.correct),
    graded: Number(r.graded),
    avgBand: r.avgBand === null ? null : Number(r.avgBand),
    createdAt: new Date(r.createdAt),
  }));

  // The freshest attempt drives "Continue where you left off". Speaking/writing
  // are practised set-by-set too, so the same /practice/<section>/<type> route
  // resumes any of them (the player itself restores the last passage locally).
  const continueLast = recentActivity[0]
    ? {
        section: recentActivity[0].section,
        questionType: recentActivity[0].questionType,
        setTitle: recentActivity[0].setTitle,
        createdAt: recentActivity[0].createdAt,
      }
    : null;

  return {
    todayAttempted,
    todayCorrect,
    todayAccuracy,
    totalAttempted,
    totalCorrect,
    totalAccuracy,
    currentStreak,
    longestStreak,
    sectionStats,
    recentMocks,
    typeStats,
    recentActivity,
    continueLast,
  };
}
