"use server";

import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { userResponses, questions } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { QUESTION_TYPES, type QuestionTypeKey } from "@/lib/ielts";
import { scoreWriting, type WritingTaskType } from "@/lib/writing/gemini";
import { guardAi, RateLimitError } from "@/lib/security/rate-guard";

/**
 * Score every unscored Writing answer in one attempt with Gemini.
 *
 * Mirrors scoreAttemptSpeaking: runs AFTER submit (a grading call takes a few
 * seconds), rows land with band=null and are filled in here. The band is
 * computed server-side and written straight to the row — never trusted from the
 * client. A scoring outage leaves the row unscored rather than failing submit.
 */
export async function scoreAttemptWriting(
  attemptId: string,
): Promise<{ scored: number; limited?: boolean; message?: string }> {
  const user = await requireUser();

  try {
    await guardAi(user.id);
  } catch (e) {
    if (e instanceof RateLimitError) return { scored: 0, limited: true, message: e.message };
    throw e;
  }

  const rows = await db
    .select({ resp: userResponses, prompt: questions.prompt })
    .from(userResponses)
    .leftJoin(questions, eq(questions.id, userResponses.questionId))
    .where(
      and(
        eq(userResponses.attemptId, attemptId),
        eq(userResponses.userId, user.id),
        eq(userResponses.section, "writing"),
        isNull(userResponses.band),
      ),
    );

  let scored = 0;
  for (const { resp, prompt } of rows) {
    const r = resp.response as Record<string, unknown> | null;
    const text = typeof r?.text === "string" ? r.text.trim() : "";
    if (!text) continue;

    const qt = resp.questionType as QuestionTypeKey;
    const meta = QUESTION_TYPES[qt];
    if (!meta || meta.family !== "writing") continue;

    const result = await scoreWriting({
      text,
      taskType: qt as WritingTaskType,
      module: resp.module,
      questionPrompt: prompt ?? meta.instruction ?? "",
      wordMin: meta.wordLimitMin ?? (qt === "writing_task2" ? 250 : 150),
    });
    if (!result.ok) continue;

    const s = result.score;
    await db
      .update(userResponses)
      .set({
        band: s.overall.toFixed(1),
        aiFeedback: {
          onTask: s.onTask,
          wordCount: s.wordCount,
          overallFeedback: s.overallFeedback,
          criteria: s.criteria,
          corrections: s.corrections,
          improvedExamples: s.improvedExamples,
          nextSteps: s.nextSteps,
          provider: "gemini",
        },
      })
      .where(eq(userResponses.id, resp.id));
    scored++;
  }

  return { scored };
}
