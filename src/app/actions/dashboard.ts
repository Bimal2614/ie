"use server";

import { and, eq, gte, lte, count, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { userResponses, questionSets, mockTestResults, mockTestSessions } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import type { SectionKey, QuestionTypeKey } from "@/lib/ielts";

/* ------------------------------------------------------------------ *
 * Dashboard stats — aggregates for the main dashboard
 * ------------------------------------------------------------------ */

export type DashboardStats = {
  // Today
  todayAttempted: number;
  todayCorrect: number;
  todayTimeMin: number;
  todayAccuracy: number;
  // All-time
  totalAttempted: number;
  totalCorrect: number;
  totalTimeMin: number;
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
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await requireUser();
  const userId = user.id;

  // Date boundaries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // -- Today's stats --
  const todayRows = await db
    .select({
      total: count(),
      correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
      timeSec: sql<number>`coalesce(sum(${userResponses.timeSpentSec}), 0)`,
    })
    .from(userResponses)
    .where(
      and(
        eq(userResponses.userId, userId),
        gte(userResponses.createdAt, todayStart),
        lte(userResponses.createdAt, todayEnd),
      ),
    );
  const today = todayRows[0] ?? { total: 0, correct: 0, timeSec: 0 };
  const todayAttempted = Number(today.total);
  const todayCorrect = Number(today.correct);
  const todayTimeMin = Math.round(Number(today.timeSec) / 60);
  const todayAccuracy = todayAttempted > 0 ? Math.round((todayCorrect / todayAttempted) * 100) : 0;

  // -- All-time stats --
  const allTimeRows = await db
    .select({
      total: count(),
      correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
      timeSec: sql<number>`coalesce(sum(${userResponses.timeSpentSec}), 0)`,
    })
    .from(userResponses)
    .where(eq(userResponses.userId, userId));
  const allTime = allTimeRows[0] ?? { total: 0, correct: 0, timeSec: 0 };
  const totalAttempted = Number(allTime.total);
  const totalCorrect = Number(allTime.correct);
  const totalTimeMin = Math.round(Number(allTime.timeSec) / 60);
  const totalAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  // -- Section breakdown --
  const sectionRows = await db
    .select({
      section: userResponses.section,
      total: count(),
      correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
    })
    .from(userResponses)
    .where(eq(userResponses.userId, userId))
    .groupBy(userResponses.section);

  const sections: SectionKey[] = ["listening", "reading", "writing", "speaking"];
  const sectionStats = Object.fromEntries(
    sections.map((s) => {
      const row = sectionRows.find((r) => r.section === s);
      const attempted = row ? Number(row.total) : 0;
      const correct = row ? Number(row.correct) : 0;
      return [s, { attempted, correct, accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0 }];
    }),
  ) as DashboardStats["sectionStats"];

  // -- Streak calculation (consecutive days with activity) --
  const activeDaysRows = await db
    .select({
      day: sql<string>`date(${userResponses.createdAt} AT TIME ZONE 'UTC')`,
    })
    .from(userResponses)
    .where(eq(userResponses.userId, userId))
    .groupBy(sql`date(${userResponses.createdAt} AT TIME ZONE 'UTC')`)
    .orderBy(desc(sql`date(${userResponses.createdAt} AT TIME ZONE 'UTC')`));

  const activeDays = activeDaysRows.map((r) => r.day);
  let currentStreak = 0;
  let longestStreak = 0;

  if (activeDays.length > 0) {
    // Check if user was active today or yesterday
    const todayStr = todayStart.toISOString().slice(0, 10);
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (activeDays[0] === todayStr || activeDays[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 1; i < activeDays.length; i++) {
        const prev = new Date(activeDays[i - 1]);
        const curr = new Date(activeDays[i]);
        const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
        if (Math.round(diff) === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Longest streak
    let streak = 1;
    for (let i = 1; i < activeDays.length; i++) {
      const prev = new Date(activeDays[i - 1]);
      const curr = new Date(activeDays[i]);
      const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (Math.round(diff) === 1) {
        streak++;
      } else {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  // -- Recent mock results --
  const mockRows = await db
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
    .limit(5);

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

  // -- Question type breakdown --
  const typeRows = await db
    .select({
      section: userResponses.section,
      questionType: userResponses.questionType,
      total: count(),
      correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
    })
    .from(userResponses)
    .where(eq(userResponses.userId, userId))
    .groupBy(userResponses.section, userResponses.questionType);

  const typeStats = typeRows.map((r) => ({
    section: r.section,
    questionType: r.questionType,
    attempted: Number(r.total),
    correct: Number(r.correct),
    accuracy: Number(r.total) > 0 ? Math.round((Number(r.correct) / Number(r.total)) * 100) : 0,
  }));

  // -- Recent activity: last 10 attempts, rolled up from their rows --
  const recentRows = await db
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
    .limit(10);

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

  return {
    todayAttempted,
    todayCorrect,
    todayTimeMin,
    todayAccuracy,
    totalAttempted,
    totalCorrect,
    totalTimeMin,
    totalAccuracy,
    currentStreak,
    longestStreak,
    sectionStats,
    recentMocks,
    typeStats,
    recentActivity,
  };
}
