"use client";

import { SetBody, type PlayerSet, type PlayerQuestion, type PlayerResult } from "@/components/practice/set-body";
import type { Answer } from "@/lib/question-content";

/**
 * Review an attempt in the same layout it was answered in.
 *
 * Reuses the practice renderer rather than re-describing answers as a list:
 * reviewing a matching-headings attempt is meaningless without the paragraphs
 * beside it, and a table-completion answer only makes sense in its cell.
 * SetBody already draws the stimulus, the shared layout and per-gap verdicts —
 * passing `results` puts every input in its graded, read-only state, so review
 * is the same screen with the marks filled in.
 */
export function AttemptReview({
  set,
  questions,
  answers,
  results,
}: {
  set: PlayerSet;
  questions: PlayerQuestion[];
  answers: Record<string, Answer>;
  results: PlayerResult[];
}) {
  return (
    <SetBody
      set={set}
      questions={questions}
      answers={answers}
      results={results}
      // Inputs are already disabled by `results`; nothing can be re-answered.
      onAnswer={() => {}}
    />
  );
}
