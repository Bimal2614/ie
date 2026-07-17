import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SECTIONS, QUESTION_TYPES, SECTION_ORDER, type SectionKey, type QuestionTypeKey } from "@/lib/ielts";
import { getSetPaginated, getAttemptedSets } from "@/app/actions/questions";
import { PracticeSession } from "@/components/practice/practice-session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string; type: string }>;
}): Promise<Metadata> {
  const { section, type } = await params;
  const sec = SECTIONS[section as SectionKey];
  const meta = QUESTION_TYPES[type as QuestionTypeKey];
  return {
    title: `${meta?.label ?? "Practice"} — ${sec?.label ?? "IELTS"} · IELTSAce`,
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
