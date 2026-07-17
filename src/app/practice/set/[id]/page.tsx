import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { questionSets, questions } from "@/db/schema";
import { QUESTION_TYPES, SECTIONS, type QuestionTypeKey, type SectionKey } from "@/lib/ielts";
import type { SetLayout } from "@/lib/question-content";
import { QuestionPlayer, type PlayerSet, type PlayerQuestion } from "@/components/practice/question-player";

export const metadata: Metadata = { title: "Practice task · IELTSAce", robots: { index: false } };

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/practice/${set.section}`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {sec.label}
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="display text-xl">{meta.label}</h1>
        <span className={`chip chip-${sec.accent}`}>{sec.label}</span>
        {set.estimatedMinutes ? (
          <span className="chip"><Clock className="size-3" /> ~{set.estimatedMinutes} min</span>
        ) : null}
      </div>

      <QuestionPlayer set={playerSet} questions={playerQuestions} />
    </div>
  );
}
