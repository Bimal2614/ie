import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { questionSets, questions } from "@/db/schema";
import { QUESTION_TYPES, SECTIONS, type QuestionTypeKey, type SectionKey } from "@/lib/ielts";
import type { SetLayout } from "@/lib/question-content";
import { QuestionPlayer, type PlayerSet, type PlayerQuestion } from "@/components/practice/question-player";

export const metadata: Metadata = { title: "Practice task · IELTSVega", robots: { index: false } };

export default async function PracticeSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [set] = await db.select().from(questionSets).where(eq(questionSets.id, id)).limit(1);
  if (!set) notFound();

  const qs = await db.select().from(questions).where(eq(questions.setId, id)).orderBy(questions.orderIndex);

  const sec = SECTIONS[set.section as SectionKey];
  const meta = QUESTION_TYPES[set.questionType as QuestionTypeKey];

  const playerSet: PlayerSet = {
    id: set.id,
    title: set.title,
    instructions: set.instructions,
    section: set.section as SectionKey,
    questionType: set.questionType as QuestionTypeKey,
    passageText: set.passageText,
    audioUrl: set.audioUrl,
    imageUrl: set.imageUrl,
    layout: (set.layout as SetLayout | null) ?? null,
    startNumber: set.startNumber,
  };
  const playerQuestions: PlayerQuestion[] = qs.map((q) => ({
    id: q.id,
    questionType: q.questionType as QuestionTypeKey,
    prompt: q.prompt,
    content: q.content as Record<string, unknown> | null,
    wordLimitMin: q.wordLimitMin,
    prepSeconds: q.prepSeconds,
    speakSeconds: q.speakSeconds,
  }));

  // No page chrome: <QuestionPlayer/> renders the exam shell, which is fixed to
  // the viewport and carries its own header, way out and answer strip. Wrapping
  // it in a centred document column would box the exam inside the app layout.
  return (
    <QuestionPlayer
      set={playerSet}
      questions={playerQuestions}
      paperTitle={`${sec.label} · ${meta.label}`}
      exitHref={`/practice/${set.section}`}
    />
  );
}
