import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SECTIONS, QUESTION_TYPES, SECTION_ORDER, type SectionKey, type QuestionTypeKey } from "@/lib/ielts";
import { getSetPaginated, getAttemptedSets } from "@/app/actions/questions";
import { PracticeSession } from "@/components/practice/practice-session";

/**
 * Room for the scoring that runs after the response.
 *
 * A submit from this page schedules AI band scoring with `after()`, which runs
 * inside THIS invocation once the response is out — so the route's duration is
 * what bounds it. A Speaking batch is tens of seconds per wave; at the platform
 * default of 15s that work was being killed halfway through, leaving answers
 * saved and band-less. 300s is the fluid-compute default, stated explicitly so a
 * lower project-level default cannot silently reintroduce that.
 *
 * It is a ceiling, not a reservation: nothing is billed for time not spent, and
 * anything this still cannot finish is picked up by /api/cron/scoring.
 */
export const maxDuration = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string; type: string }>;
}): Promise<Metadata> {
  const { section, type } = await params;
  const sec = SECTIONS[section as SectionKey];
  const meta = QUESTION_TYPES[type as QuestionTypeKey];
  return {
    title: `${meta?.label ?? "Practice"}, ${sec?.label ?? "IELTS"} · IELTSVega`,
    robots: { index: false },
  };
}

export default async function PracticeTypePage({
  params,
}: {
  params: Promise<{ section: string; type: string }>;
}) {
  const { section, type } = await params;

  // Validate section and type
  if (!SECTION_ORDER.includes(section as SectionKey)) notFound();
  if (!(type in QUESTION_TYPES)) notFound();

  // NO PLAN GATE HERE, deliberately. Practising is free on every tier; what a
  // plan buys is the AI examiner's band. Turning someone away at the door means
  // they cannot even read a Task 2 prompt, and a candidate who has not seen the
  // work has no reason to pay for it. submitPractice is where the plan answers.

  // Prefetch first SET (passage + all questions) + attempted set indices
  const [initialData, initialAttempted] = await Promise.all([
    getSetPaginated(section, type, 1),
    getAttemptedSets(section, type),
  ]);

  return (
    <PracticeSession
      section={section as SectionKey}
      questionType={type as QuestionTypeKey}
      initialData={initialData}
      initialAttempted={initialAttempted}
    />
  );
}
