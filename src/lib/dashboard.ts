import type { DashboardStats } from "@/app/actions/dashboard";
import { SECTION_ORDER, accuracyToBand, type SectionKey } from "@/lib/ielts";

/**
 * "What to do next" — derive the learner's weakest attempted section and their
 * lowest-scoring question types. Pure and view-agnostic, so the dashboard (or
 * anything else) can render the recommendation without re-deriving it.
 *
 * Everything is ranked on the 0–9 BAND scale rather than on accuracy, because
 * accuracy isn't comparable across skills: Listening/Reading are marked
 * right/wrong, while Writing/Speaking only ever produce a band. Objective
 * accuracy is converted to a band via the real /40 conversion table, so a
 * Reading 70% and a Writing 6.5 sit on one scale and "weakest" is meaningful.
 */

/** Band a learner is aiming for when they haven't set one. */
export const DEFAULT_TARGET_BAND = 7;

/**
 * Graded responses needed before a question type can be called "weak". One
 * unlucky set shouldn't outrank a type practised fifty times.
 */
export const MIN_GRADED_FOR_WEAK = 5;

export type SectionFocus = {
  key: SectionKey;
  accuracy: number;
  attempted: number;
  correct: number;
  /** Where this section currently sits on the band scale, if it can be judged. */
  band: number | null;
  /** How far below the learner's target that band is (0 when at or above). */
  gap: number;
};

export type FocusRecommendation = {
  weakestSection: SectionFocus | null;
  weakTypes: DashboardStats["typeStats"];
  /** The target everything was measured against. */
  targetBand: number;
  /** True when nothing has enough graded work yet to rank. */
  needsMorePractice: boolean;
};

/** Current band for a section: measured for Writing/Speaking, derived for L/R. */
function sectionBand(
  key: SectionKey,
  s: DashboardStats["sectionStats"][SectionKey],
): number | null {
  if (s.graded === 0) return null;
  // Writing/Speaking carry a real examiner-style band; trust it directly.
  if (key === "writing" || key === "speaking") return s.avgBand;
  return accuracyToBand(key, s.accuracy);
}

export function recommendFocus(
  stats: DashboardStats,
  opts: { targetBand?: number | string | null; weakTypeCount?: number } = {},
): FocusRecommendation {
  const parsedTarget = Number(opts.targetBand);
  const targetBand =
    Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : DEFAULT_TARGET_BAND;
  const weakTypeCount = opts.weakTypeCount ?? 3;

  const judged: SectionFocus[] = SECTION_ORDER.map((key) => {
    const s = stats.sectionStats[key];
    const band = sectionBand(key, s);
    return {
      key,
      accuracy: s.accuracy,
      attempted: s.attempted,
      correct: s.correct,
      band,
      gap: band === null ? 0 : Math.max(0, Math.round((targetBand - band) * 10) / 10),
    };
  }).filter((s) => s.band !== null);

  // Weakest = furthest below target. Ties break on the lower band.
  const weakestSection = judged.length
    ? judged.reduce((a, b) => (b.gap > a.gap || (b.gap === a.gap && (b.band ?? 9) < (a.band ?? 9)) ? b : a))
    : null;

  // Only rank types with enough graded work; an ungraded type says nothing yet.
  const rankable = stats.typeStats.filter((t) => t.graded >= MIN_GRADED_FOR_WEAK);
  const weakTypes = [...rankable].sort((a, b) => a.accuracy - b.accuracy).slice(0, weakTypeCount);

  return {
    weakestSection,
    weakTypes,
    targetBand,
    needsMorePractice: weakestSection === null,
  };
}
