import type { DashboardStats } from "@/app/actions/dashboard";
import { SECTION_ORDER, type SectionKey } from "@/lib/ielts";

/**
 * "What to do next" — derive the learner's weakest attempted section and their
 * lowest-scoring question types. Pure and view-agnostic, so the dashboard (or
 * anything else) can render the recommendation without re-deriving it.
 */
export type FocusRecommendation = {
  weakestSection: { key: SectionKey; accuracy: number; attempted: number; correct: number } | null;
  weakTypes: DashboardStats["typeStats"];
};

export function recommendFocus(stats: DashboardStats, weakTypeCount = 3): FocusRecommendation {
  const attempted = SECTION_ORDER
    .map((key) => ({ key, ...stats.sectionStats[key] }))
    .filter((s) => s.attempted > 0);

  const weakestSection = attempted.length
    ? attempted.reduce((a, b) => (b.accuracy < a.accuracy ? b : a))
    : null;

  const weakTypes = [...stats.typeStats]
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, weakTypeCount);

  return { weakestSection, weakTypes };
}
