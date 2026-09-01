import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questionSets, questions } from "@/db/schema";
import { QUESTION_TYPES, SECTIONS, type QuestionTypeKey, type SectionKey } from "@/lib/ielts";
import { mediaUrl } from "@/lib/media-urls";
import type { SetLayout } from "@/lib/question-content";
import { QuestionPlayer, type PlayerSet, type PlayerQuestion } from "@/components/practice/question-player";

export const metadata: Metadata = { title: "Practice task · IELTSVega", robots: { index: false } };

export default async function PracticeSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // `is_active` matters here, not just in the library listing: a retired set
  // still has a working URL, and a deep link is exactly how a retired question
  // keeps being served after it was withdrawn from the catalogue.
  const [set] = await db
    .select()
    .from(questionSets)
    .where(and(eq(questionSets.id, id), eq(questionSets.isActive, true)))
    .limit(1);
  if (!set) notFound();

  const qs = await db
    .select()
    .from(questions)
    .where(and(eq(questions.setId, id), eq(questions.isActive, true)))
    .orderBy(questions.orderIndex);

  const sec = SECTIONS[set.section as SectionKey];
  const meta = QUESTION_TYPES[set.questionType as QuestionTypeKey];

  const playerSet: PlayerSet = {
    id: set.id,
    title: set.title,
    instructions: set.instructions,
    section: set.section as SectionKey,
    questionType: set.questionType as QuestionTypeKey,
    passageText: set.passageText,
    // OUR gated paths, never the stored `s3://` value. This page used to pass
    // the raw column through: that publishes the bucket and key to anyone
    // reading the RSC payload, and an `s3://` URL is not one a browser can load
    // anyway, so the recording never played. See src/lib/media-urls.ts.
    audioUrl: mediaUrl.setAudio(set.id, set.audioUrl),
    imageUrl: mediaUrl.setImage(set.id, set.imageUrl),
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
    promptAudioUrl: mediaUrl.questionPromptAudio(q.id, q.promptAudioUrl),
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
