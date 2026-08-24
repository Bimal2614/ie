import "server-only";

import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { practiceSections, questions } from "@/db/schema";

/**
 * What the candidate was actually ASKED, for a batch of `user_responses` rows.
 *
 * Both scorers depend on this and neither degrades gracefully without it. The
 * speaking service judges relevance and topic development against the `question`
 * we send, and the entire grade turns on the task that was set. Passing the
 * question TYPE's generic blurb instead — "Answer questions about yourself and
 * familiar topics." — is worse than passing nothing: it makes a perfectly
 * on-topic answer read as off-topic, so an honest omission beats a wrong prompt.
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

/** A Speaking Part 2 cue card: the topic, and the "You should say" bullets. */
export type CueCard = { topic: string; bullets: string[] };

export type ResolvedPrompt = {
  /**
   * The real question text, or null when the content genuinely has none. For a
   * cue card this is the topic and bullets flattened into one string — the form
   * the grader takes, and the fallback for any caller that wants a single prompt.
   */
  prompt: string | null;
  /**
   * The cue card kept STRUCTURED, for callers that can use it that way. The
   * speaking API takes the topic as `question` and the bullets as
   * `cue_card_points`, and assesses topic development against the bullets
   * individually — flattening them into the question loses that.
   */
  cueCard: CueCard | null;
  /** Authored minimum for a Writing task, when the content specifies one. */
  wordLimitMin: number | null;
};

/**
 * Read a cue card off authored content, discarding an empty one.
 *
 * Speaking Part 2 asks its question as a topic plus bullet points, and the
 * bullets are the part that makes an answer relevant — "Describe a book you
 * enjoyed" alone loses "why you liked it", so an answer covering the bullets
 * would score as partly off-topic.
 */
function normaliseCueCard(
  cue: { topic?: string; bullets?: string[] } | null | undefined,
): CueCard | null {
  if (!cue) return null;
  const topic = typeof cue.topic === "string" ? cue.topic.trim() : "";
  const bullets = Array.isArray(cue.bullets)
    ? cue.bullets.filter((b): b is string => typeof b === "string" && b.trim().length > 0)
    : [];
  if (!topic && bullets.length === 0) return null;
  return { topic, bullets };
}

/** The flattened single-string form, for callers that take one prompt. */
function cueCardToPrompt(cue: CueCard | null): string | null {
  if (!cue) return null;
  return [cue.topic, ...cue.bullets.map((b) => `- ${b}`)].filter(Boolean).join("\n");
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
      const cue = normaliseCueCard(
        (q.content as { cueCard?: { topic: string; bullets: string[] } } | null)?.cueCard,
      );
      // A cue card IS the question for Part 2, so prefer it over a bare prompt.
      out.set(row.id, {
        prompt: cueCardToPrompt(cue) ?? (q.prompt?.trim() || null),
        cueCard: cue,
        wordLimitMin: q.wordLimitMin ?? null,
      });
      continue;
    }

    if (!row.setId || row.questionNumber === null) continue;
    const item = bySection.get(row.setId)?.get(row.questionNumber);
    if (!item) continue;
    const cue = normaliseCueCard(item.cueCard);
    out.set(row.id, {
      prompt: cueCardToPrompt(cue) ?? (item.prompt?.trim() || null),
      cueCard: cue,
      wordLimitMin: item.wordLimitMin ?? null,
    });
  }

  return out;
}
