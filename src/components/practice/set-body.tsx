"use client";

import { useMemo } from "react";
import { QUESTION_TYPES, showsInstruction, type SectionKey, type QuestionTypeKey } from "@/lib/ielts";
import type { Answer, SetLayout } from "@/lib/question-content";
import {
  QuestionBody,
  type BodyDoc,
  type BodyResult,
} from "./question-body";

/**
 * Question practice: one task, optionally with a passage beside it.
 *
 * An ADAPTER, not a renderer. Everything on screen is drawn by <QuestionBody/>,
 * which section practice also uses — the two surfaces used to be two 500-line
 * components wrapping the same leaf widgets, and every fix had to be made twice
 * (or, three times this year, was not). What is left here is the mapping from
 * this surface's data into the shared document model, plus the handful of
 * behaviours that genuinely belong to it.
 *
 * A set is a document with ONE group: the type, the layout and the instruction
 * are properties of the whole set rather than of a run of questions inside it.
 */

export type PlayerSet = {
  id: string;
  title: string;
  instructions: string | null;
  section: SectionKey;
  questionType: QuestionTypeKey;
  passageText: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  layout: SetLayout | null;
  startNumber: number;
};

export type PlayerQuestion = {
  id: string;
  questionType: QuestionTypeKey;
  prompt: string | null;
  content: Record<string, unknown> | null;
  wordLimitMin: number | null;
  prepSeconds: number | null;
  speakSeconds: number | null;
};

export type PlayerResult = {
  questionId: string;
  isCorrect: boolean | null;
  correctAnswer: unknown;
  explanation: string | null;
};

export function SetBody({
  set,
  questions,
  answers,
  results,
  onAnswer,
  onClearAnswer,
  flagged,
  onToggleFlag,
}: {
  set: PlayerSet;
  questions: PlayerQuestion[];
  answers: Record<string, Answer>;
  results: PlayerResult[] | null;
  onAnswer: (questionId: string, value: Answer) => void;
  onClearAnswer?: (questionId: string) => void;
  /** Client-side "mark for review" set + toggle (optional — omitted in mock review). */
  flagged?: Set<string>;
  onToggleFlag?: (questionId: string) => void;
}) {
  const meta = QUESTION_TYPES[set.questionType];

  const doc: BodyDoc = useMemo(
    () => ({
      sectionType: set.section,
      title: set.title,
      passageText: set.passageText,
      // Auth-gated media routes, never the stored s3:// value.
      audioSrc: set.audioUrl ? `/api/media/${set.id}` : null,
      imageSrc: set.imageUrl ? `/api/media/${set.id}/image` : null,
      groups: [
        {
          questionType: set.questionType,
          from: set.startNumber,
          to: set.startNumber + Math.max(0, questions.length - 1),
          layout: set.layout,
          // Exam numbering: the set says where its questions start, so passage 2
          // opens at 14 exactly as the paper does.
          items: questions.map((q, i) => ({
            key: q.id,
            n: set.startNumber + i,
            // A set's questions are one mark each; paired items only exist in
            // the section documents.
            marks: 1,
            questionType: q.questionType,
            prompt: q.prompt,
            content: q.content,
            wordLimitMin: q.wordLimitMin,
            prepSeconds: q.prepSeconds,
            speakSeconds: q.speakSeconds,
          })),
        },
      ],
    }),
    [set, questions],
  );

  const bodyResults: BodyResult[] | null = useMemo(
    () =>
      results?.map((r) => ({
        key: r.questionId,
        isCorrect: r.isCorrect,
        correctAnswer: r.correctAnswer,
        explanation: r.explanation,
      })) ?? null,
    [results],
  );

  return (
    <QuestionBody
      doc={doc}
      answers={answers}
      results={bodyResults}
      onAnswer={onAnswer}
      onClearAnswer={onClearAnswer}
      config={{
        // One task, so the instruction belongs above the whole thing rather than
        // in a per-group band.
        instructionText: showsInstruction(set.questionType)
          ? (set.instructions ?? meta.instruction ?? null)
          : null,
        groupHeaders: false,
        // `mq-` is what the mock's question palette scrolls to.
        anchorPrefix: "mq",
        // Reading puts the passage beside the questions.
        splitStimulus: set.section === "reading",
        // Speaking Parts 1 and 3 are an interview, one question at a time.
        sequential: meta.presentation === "sequential",
        // Listening sets carry a per-question window into the recording.
        clips: true,
        progressBar: true,
        reportOn: "row",
        // A diagram layout draws the figure itself, with pins on it — so the
        // layout gets the image, and the stimulus block then must not repeat it.
        layoutFallbackImage: set.imageUrl ? `/api/media/${set.id}/image` : null,
        stimulusImage: Boolean(set.imageUrl) && set.layout?.kind !== "diagram",
        flagged,
        onToggleFlag,
      }}
    />
  );
}
