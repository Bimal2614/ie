"use server";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiCreditSpends, userResponses } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import type { SectionKey, QuestionTypeKey } from "@/lib/ielts";

export type CreditSpend = {
  attemptId: string;
  section: SectionKey;
  questionType: QuestionTypeKey;
  spentAt: string;
  /** Mean band of the attempt's answers; null while the scorer is still working. */
  avgBand: number | null;
};

export type CreditUsage = { remaining: number; spends: CreditSpend[] };

/** A free plan's grant is 5 by default; this is a backstop, not pagination. */
const MAX_SPENDS = 50;

/**
 * What the free AI credits went on, for the top bar's credits popover.
 *
 * The ledger (`ai_credit_spends`) says which attempts were paid for; the
 * attempt's own rows say what it was and how it scored. An attempt is one
 * section and one type, so min() just picks the shared value.
 */
export async function getCreditUsage(): Promise<CreditUsage> {
  const user = await requireUser();

  const rows = await db
    .select({
      attemptId: aiCreditSpends.attemptId,
      spentAt: aiCreditSpends.createdAt,
      section: sql<SectionKey>`min(${userResponses.section}::text)`,
      questionType: sql<QuestionTypeKey>`min(${userResponses.questionType}::text)`,
      avgBand: sql<string | null>`avg(${userResponses.band})`,
    })
    .from(aiCreditSpends)
    .innerJoin(userResponses, eq(userResponses.attemptId, aiCreditSpends.attemptId))
    .where(eq(aiCreditSpends.userId, user.id))
    .groupBy(aiCreditSpends.attemptId, aiCreditSpends.createdAt)
    .orderBy(desc(aiCreditSpends.createdAt))
    .limit(MAX_SPENDS);

  return {
    remaining: user.aiCredits,
    spends: rows.map((r) => ({
      attemptId: r.attemptId,
      section: r.section,
      questionType: r.questionType,
      spentAt: r.spentAt.toISOString(),
      avgBand: r.avgBand === null ? null : Math.round(Number(r.avgBand) * 2) / 2,
    })),
  };
}
