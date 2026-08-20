import "server-only";

import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { practiceSections, questions } from "@/db/schema";

/**
 * What the candidate was actually ASKED, for a batch of `user_responses` rows.
 *
 * Both scorers depend on this and neither degrades gracefully without it.
 * SpeechSuper scores `relevance` against the `question_prompt` we send, and
 * Gemini's entire grade turns on the task that was set. Passing the question
 * TYPE's generic blurb instead — "Answer questions about yourself and familiar
 * topics." — is worse than passing nothing: it makes a perfectly on-topic answer
 * read as off-topic. (SpeechSuper defaults relevance to 100 when the prompt is
 * omitted, so an honest omission beats a wrong prompt.)
 *
 * A response points at its question in one of two ways, because our content
 * lives in two shapes. This resolves both:
 *
 *   - `question_id` → a row in `questions`         (question practice, mock)
 *   - `set_id` + `question_number` → an item inside a `practice_sections`
 *     jsonb document, which has no uuid of its own  (section practice)
 *
 * Batched: at most two queries no matter how many rows are passed, so scoring a
 * 40-item paper doesn't turn into 40 round-trips.
 */

/** The subset of a response row needed to find its question. */
export type PromptLookupRow = {
  id: string;
  questionId: string | null;
  setId: string | null;
  questionNumber: number | null;
};

export type ResolvedPrompt = {
  /** The real question text, or null when the content genuinely has none. */
  prompt: string | null;
  /** Authored minimum for a Writing task, when the content specifies one. */
  wordLimitMin: number | null;
};

/**
 * Flatten a cue card into the single prompt string the scorers take.
 *
 * Speaking Part 2 asks its question as a topic plus bullet points, and the
 * bullets are the part that makes an answer relevant — "Describe a book you
 * enjoyed" alone loses "why you liked it", so an answer covering the bullets
 * would score as partly off-topic.
 */
function cueCardToPrompt(cue: { topic?: string; bullets?: string[] } | null | undefined): string | null {
  if (!cue) return null;
  const topic = typeof cue.topic === "string" ? cue.topic.trim() : "";
  const bullets = Array.isArray(cue.bullets) ? cue.bullets.filter((b) => typeof b === "string") : [];
  if (!topic && bullets.length === 0) return null;
  return [topic, ...bullets.map((b) => `- ${b}`)].filter(Boolean).join("\n");
}

/** Keyed by response row id. Rows with no resolvable question are absent. */
export async function resolvePrompts(
  rows: PromptLookupRow[],
): Promise<Map<string, ResolvedPrompt>> {
  const out = new Map<string, ResolvedPrompt>();
  if (rows.length === 0) return out;

  const questionIds = [...new Set(rows.map((r) => r.questionId).filter((v): v is string => !!v))];
  // Only rows with no question row of their own fall back to a section document.
  const sectionIds = [
    ...new Set(
      rows
        .filter((r) => !r.questionId && r.questionNumber !== null)
        .map((r) => r.setId)
        .filter((v): v is string => !!v),
    ),
  ];

  const [questionRows, sectionRows] = await Promise.all([
    questionIds.length > 0
      ? db
          .select({
            id: questions.id,
            prompt: questions.prompt,
            content: questions.content,
            wordLimitMin: questions.wordLimitMin,
          })
          .from(questions)
          .where(inArray(questions.id, questionIds))
      : Promise.resolve([]),
    sectionIds.length > 0
      ? db
          .select({ id: practiceSections.id, questions: practiceSections.questions })
          .from(practiceSections)
          .where(inArray(practiceSections.id, sectionIds))
      : Promise.resolve([]),
  ]);

  const byQuestion = new Map(questionRows.map((q) => [q.id, q]));

  // Index every section's items by exam number — that number is the only id a
  // jsonb item has, and it's what the response row carries.
  const bySection = new Map<string, Map<number, { prompt?: string; wordLimitMin?: number; cueCard?: { topic: string; bullets: string[] } }>>();
  for (const s of sectionRows) {
    const items = new Map<number, { prompt?: string; wordLimitMin?: number; cueCard?: { topic: string; bullets: string[] } }>();
    for (const group of s.questions?.groups ?? []) {
      for (const item of group.items) {
        items.set(item.n, { prompt: item.prompt, wordLimitMin: item.wordLimitMin, cueCard: item.cueCard });
      }
    }
    bySection.set(s.id, items);
  }

  for (const row of rows) {
    if (row.questionId) {
      const q = byQuestion.get(row.questionId);
      if (!q) continue;
      const cue = (q.content as { cueCard?: { topic: string; bullets: string[] } } | null)?.cueCard;
      // A cue card IS the question for Part 2, so prefer it over a bare prompt.
      out.set(row.id, {
        prompt: cueCardToPrompt(cue) ?? (q.prompt?.trim() || null),
        wordLimitMin: q.wordLimitMin ?? null,
      });
      continue;
    }

    if (!row.setId || row.questionNumber === null) continue;
    const item = bySection.get(row.setId)?.get(row.questionNumber);
    if (!item) continue;
    out.set(row.id, {
      prompt: cueCardToPrompt(item.cueCard) ?? (item.prompt?.trim() || null),
      wordLimitMin: item.wordLimitMin ?? null,
    });
  }

  return out;
}
