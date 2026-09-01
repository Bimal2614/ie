"use server";

import { and, eq, gte, lte, count, countDistinct, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { userResponses, questions, questionSets, mockTestResults, mockTestSessions } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { PASS_BAND } from "@/lib/ielts";
import type { SectionKey } from "@/lib/ielts";

/* ------------------------------------------------------------------ *
 * Dashboard stats — aggregates for the main dashboard
 * ------------------------------------------------------------------ */

export type DashboardStats = {
  // Today
  todayAttempted: number;
  /** Responses with a verdict — the denominator to show "x of y correct" against. */
  todayGraded: number;
  todayCorrect: number;
  todayAccuracy: number;
  // All-time
  totalAttempted: number;
  totalGraded: number;
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
      /** Responses with a verdict: objective is_correct, or a band. */
      graded: number;
      /** Objectively correct, or band >= PASS_BAND. */
      right: number;
      wrong: number;
      /** Mean band across scored responses — the only signal for Writing/Speaking. */
      avgBand: number | null;
      /** right / graded. */
      accuracy: number;
      /** Distinct SETS (recordings/passages/tasks/topics) the user has opened. */
      practisedSets: number;
      /** Sets available in this section — same unit the practice library shows. */
      availableSets: number;
      /** practisedSets / availableSets, as a whole percent. */
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
    graded: number;
    right: number;
    wrong: number;
    avgBand: number | null;
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
          // `right`/`graded` span both marking styles — see the section query below.
          correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
          graded: sql<number>`count(*) filter (where ${userResponses.isCorrect} is not null or ${userResponses.band} is not null)`,
          right: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true or ${userResponses.band} >= ${PASS_BAND})`,
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
          // `right`/`graded` span both marking styles — see the section query below.
          correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
          graded: sql<number>`count(*) filter (where ${userResponses.isCorrect} is not null or ${userResponses.band} is not null)`,
          right: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true or ${userResponses.band} >= ${PASS_BAND})`,
        })
        .from(userResponses)
        .where(eq(userResponses.userId, userId)),

      // -- Section breakdown -- attempts + distinct questions practised, per section.
      // `graded`/`right` span both marking styles: objective rows carry
      // is_correct, band-scored rows (Writing/Speaking) carry a band and count as
      // right at PASS_BAND or above. Without this, Writing and Speaking read as a
      // permanent 0% because is_correct is never true for them.
      db
        .select({
          section: userResponses.section,
          total: count(),
          correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
          graded: sql<number>`count(*) filter (where ${userResponses.isCorrect} is not null or ${userResponses.band} is not null)`,
          right: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true or ${userResponses.band} >= ${PASS_BAND})`,
          avgBand: sql<number | null>`avg(${userResponses.band})`,
          // Coverage is counted in SETS (recordings/passages/tasks/topics) — the
          // unit the practice library is browsed and paginated in. Marking stays
          // per item above, because IELTS awards a mark per question.
          practisedSets: countDistinct(userResponses.setId),
        })
        .from(userResponses)
        .where(eq(userResponses.userId, userId))
        .groupBy(userResponses.section),

      // -- Sets available per section (the coverage denominator) --
      // Inner-joined to questions so a set with no live questions isn't counted
      // as practisable — matching how /practice/[section] counts its cards.
      db
        .select({ section: questionSets.section, total: countDistinct(questionSets.id) })
        .from(questionSets)
        .innerJoin(questions, and(eq(questions.setId, questionSets.id), eq(questions.isActive, true)))
        .where(eq(questionSets.isActive, true))
        .groupBy(questionSets.section),

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

      // -- Question type breakdown -- same graded/right treatment as sections.
      db
        .select({
          section: userResponses.section,
          questionType: userResponses.questionType,
          total: count(),
          correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
          graded: sql<number>`count(*) filter (where ${userResponses.isCorrect} is not null or ${userResponses.band} is not null)`,
          right: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true or ${userResponses.band} >= ${PASS_BAND})`,
          avgBand: sql<number | null>`avg(${userResponses.band})`,
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

  const today = todayRows[0] ?? { total: 0, correct: 0, graded: 0, right: 0 };
  const todayAttempted = Number(today.total);
  const todayGraded = Number(today.graded);
  // "Correct" counts objectively-right answers AND band-scored ones that cleared
  // PASS_BAND, so Writing/Speaking work is represented rather than reading as 0.
  const todayCorrect = Number(today.right);
  const todayAccuracy = todayGraded > 0 ? Math.round((todayCorrect / todayGraded) * 100) : 0;

  const allTime = allTimeRows[0] ?? { total: 0, correct: 0, graded: 0, right: 0 };
  const totalAttempted = Number(allTime.total);
  const totalGraded = Number(allTime.graded);
  const totalCorrect = Number(allTime.right);
  const totalAccuracy = totalGraded > 0 ? Math.round((totalCorrect / totalGraded) * 100) : 0;

  const sections: SectionKey[] = ["listening", "reading", "writing", "speaking"];
  const sectionStats = Object.fromEntries(
    sections.map((s) => {
      const row = sectionRows.find((r) => r.section === s);
      const attempted = row ? Number(row.total) : 0;
      const correct = row ? Number(row.correct) : 0;
      const graded = row ? Number(row.graded) : 0;
      const right = row ? Number(row.right) : 0;
      const avgBand = row?.avgBand == null ? null : Number(row.avgBand);
      const practisedSets = row ? Number(row.practisedSets) : 0;
      const availableSets = Number(availableRows.find((r) => r.section === s)?.total ?? 0);
      const completion = availableSets > 0 ? Math.round((practisedSets / availableSets) * 100) : 0;
      return [s, {
        attempted,
        correct,
        graded,
        right,
        wrong: Math.max(0, graded - right),
        avgBand,
        // Denominator is `graded`, not `attempted`: rows still awaiting a score
        // must not count as failures.
        accuracy: graded > 0 ? Math.round((right / graded) * 100) : 0,
        practisedSets,
        availableSets,
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

  const typeStats = typeRows.map((r) => {
    const graded = Number(r.graded);
    const right = Number(r.right);
    return {
      section: r.section,
      questionType: r.questionType,
      attempted: Number(r.total),
      correct: Number(r.correct),
      graded,
      right,
      wrong: Math.max(0, graded - right),
      avgBand: r.avgBand == null ? null : Number(r.avgBand),
      accuracy: graded > 0 ? Math.round((right / graded) * 100) : 0,
    };
  });

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
    todayGraded,
    todayCorrect,
    todayAccuracy,
    totalAttempted,
    totalGraded,
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
