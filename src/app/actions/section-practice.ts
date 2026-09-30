"use server";

import { requireUser } from "@/lib/dal";
import { gradeSectionFor } from "@/lib/section-grading";
import type {
  SectionItemResult,
  SectionPracticeResult,
  SectionPracticeSubmission,
} from "@/lib/section-grading";

/**
 * The website's entry point for submitting one practice section.
 *
 * The grading itself lives in src/lib/section-grading.ts, which is `server-only`
 * rather than `"use server"`. That split is the point: everything exported from
 * a `"use server"` module is a callable endpoint whose arguments come from the
 * client, so a user-taking function cannot live here without letting a crafted
 * call write answers into somebody else's history. This wrapper establishes the
 * user from their session; the JSON route handler establishes it from a bearer
 * token; neither owns the policy, so the app and the website cannot end up
 * marking the same part differently.
 */

// Re-exported so existing importers (the section player and its result card)
// keep the types they already use. Types are erased at runtime, so these are
// not additional server endpoints.
export type { SectionItemResult, SectionPracticeResult, SectionPracticeSubmission };

/** Answers arrive keyed by exam number — the only id a jsonb item has. */
type AnswerMap = Record<string, Record<string, unknown>>;

export async function submitSectionPractice(
  sectionId: string,
  answers: AnswerMap,
): Promise<SectionPracticeSubmission> {
  const user = await requireUser();
  return gradeSectionFor(user, sectionId, answers);
}
