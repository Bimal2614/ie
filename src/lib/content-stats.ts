import "server-only";

import { unstable_cache } from "next/cache";
import { and, eq, count, countDistinct, sql } from "drizzle-orm";
import { db } from "@/db";
import { questionSets, questions } from "@/db/schema";
import type { SectionKey, QuestionTypeKey } from "@/lib/ielts";

/**
 * How big the library is — cached, because it is the same number for everybody.
 *
 * These counts describe CONTENT, not the person reading it: the section page's
 * "38 passages available" and the player's "Passage 3 of 38" are identical for
 * a free account and a Pro one, and change only when an import runs. Computed
 * per request they were a database round trip on every visit and every trip
 * back — each one re-reading every active question row to answer a question
 * whose answer had not moved in weeks.
 *
 * NOTHING USER-SPECIFIC MAY BE ADDED HERE. The cache is shared across sessions,
 * so a per-user value (which sets they have attempted, their plan) would leak
 * from one account to the next. Those stay uncached, in the queries that take a
 * user id — see `getAttemptedSets`.
 */
const CONTENT_TAG = "content-counts";

/**
 * Five minutes, not an hour. Content lands through an import script rather than
 * through the app, so nothing in a request can call `revalidateTag` at the
 * moment it changes; this window is what bounds how long a freshly imported set
 * stays invisible. It still removes essentially all of the load — a section
 * page served a thousand times in five minutes runs one query, not a thousand.
 */
const TTL_SECONDS = 300;

/** Sets per question type for one section, keyed by type. Active content only. */
export const getSectionTypeCounts = unstable_cache(
  async (section: SectionKey): Promise<Record<string, number>> => {
    // A "unit" is one set (a passage / recording), not each numbered
    // sub-question under it. The inner join still requires at least one active
    // question, so empty shells are not counted.
    const rows = await db
      .select({ questionType: questionSets.questionType, n: countDistinct(questionSets.id) })
      .from(questionSets)
      .innerJoin(
        questions,
        and(eq(questions.setId, questionSets.id), eq(questions.isActive, true)),
      )
      .where(and(eq(questionSets.section, section), eq(questionSets.isActive, true)))
      .groupBy(questionSets.questionType);

    return Object.fromEntries(rows.map((r) => [r.questionType, Number(r.n)]));
  },
  ["section-type-counts"],
  { revalidate: TTL_SECONDS, tags: [CONTENT_TAG] },
);

/** Total active questions across the whole library — the practice hub's figure. */
export const getTotalQuestionCount = unstable_cache(
  async (): Promise<number> => {
    const [row] = await db
      .select({ total: count() })
      .from(questions)
      .where(eq(questions.isActive, true));
    return Number(row?.total ?? 0);
  },
  ["total-question-count"],
  { revalidate: TTL_SECONDS, tags: [CONTENT_TAG] },
);

/** How many sets and questions one section+type holds — the player's paging bounds. */
export const getTypeTotals = unstable_cache(
  async (
    section: SectionKey,
    questionType: QuestionTypeKey,
  ): Promise<{ totalSets: number; totalQuestions: number }> => {
    const [row] = await db
      .select({
        totalSets: sql<number>`count(distinct ${questionSets.id})`,
        totalQuestions: count(questions.id),
      })
      .from(questionSets)
      .leftJoin(
        questions,
        and(eq(questions.setId, questionSets.id), eq(questions.isActive, true)),
      )
      .where(
        and(
          eq(questionSets.section, section),
          eq(questionSets.questionType, questionType),
          eq(questionSets.isActive, true),
        ),
      );

    return {
      totalSets: Number(row?.totalSets ?? 0),
      totalQuestions: Number(row?.totalQuestions ?? 0),
    };
  },
  ["type-totals"],
  { revalidate: TTL_SECONDS, tags: [CONTENT_TAG] },
);

/** Drop every cached count now — for an admin action that publishes content. */
export const CONTENT_COUNTS_TAG = CONTENT_TAG;
