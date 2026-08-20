"use client";

import { useMemo } from "react";
import { QUESTION_TYPES, type QuestionTypeKey, type SectionKey } from "@/lib/ielts";
import type { Answer, SetLayout } from "@/lib/question-content";
import type { SectionItemResult } from "@/app/actions/section-practice";
import { QuestionBody, type BodyDoc, type BodyResult } from "./question-body";

/**
 * Section practice: one Cambridge exam part, in the exam's own layout.
 *
 * An ADAPTER, not a renderer — <QuestionBody/> draws everything, and question
 * practice goes through the same component. See set-body.tsx for why the two
 * were merged.
 *
 * What makes a section different from a set is that a part is one recording
 * answered as a table completion AND a note completion, so the instruction line
 * and the layout belong to the GROUP rather than the part. Gaps still bind by
 * exam number, so `[[7]]` finds item 7 whichever group it sits in and numbering
 * runs continuously across the whole part.
 */

/** One group as the client sees it — the answer key has been stripped. */
export type ClientGroup = {
  questionType: string;
  instruction?: string;
  from: number;
  to: number;
  layout?: SetLayout | null;
  items: {
    n: number;
    prompt?: string;
    options?: string[];
    selectCount?: number;
    marks?: number;
    wordLimitMin?: number;
    prepSeconds?: number;
    speakSeconds?: number;
    cueCard?: { topic: string; bullets: string[] };
  }[];
};

export type ClientSectionView = {
  id: string;
  sectionType: SectionKey;
  title: string;
  partNumber: number | null;
  instructions: string | null;
  audioUrl: string | null;
  passageText: string | null;
  imageUrl: string | null;
  startNumber: number;
  endNumber: number;
  totalQuestions: number;
  questions: { groups: ClientGroup[] };
};

export function SectionBody({
  section,
  answers,
  results,
  onAnswer,
  onClearAnswer,
  slot = "all",
  focusNumber,
  groupHeaders = true,
}: {
  section: ClientSectionView;
  answers: Record<string, Answer>;
  results: SectionItemResult[] | null;
  onAnswer: (n: number, value: Answer) => void;
  onClearAnswer?: (n: number) => void;
  /**
   * Which half to draw. The exam layout puts the passage or recording in one
   * pane and the questions in the other, so it asks for them separately; the
   * default renders both, one after the other.
   */
  slot?: "all" | "stimulus" | "questions";
  /**
   * Show only the item with this exam number. Speaking is an interview: the
   * examiner asks one question, and putting all seven on screen lets a
   * candidate read ahead and rehearse — the habit the real test punishes.
   */
  focusNumber?: number | null;
  /**
   * Draw each group's own "Questions 1-10 / Note completion / instruction"
   * band. The exam layout already shows exactly that above the panes, so a
   * single-group part would print it twice — but a part mixing two or three
   * task types still needs one per group to tell them apart.
   */
  groupHeaders?: boolean;
}) {
  /**
   * A map answers exactly one task, so it is drawn inside that group rather
   * than above the part.
   *
   * Ownership only moves to a group that will actually DRAW it — labelling with
   * a letter box. A typed diagram ("Label the diagram, ONE WORD") prints its
   * numbers on the picture and lists the blanks beneath, so the figure stays
   * the part's stimulus; claiming it there dropped the image altogether. A
   * Writing Task 1 chart is the part's stimulus for the same reason.
   */
  const figureOwner = section.imageUrl
    ? section.questions.groups.findIndex(
        (g) =>
          QUESTION_TYPES[g.questionType as QuestionTypeKey]?.family === "labelling" &&
          g.layout?.kind === "options",
      )
    : -1;

  const doc: BodyDoc = useMemo(
    () => ({
      sectionType: section.sectionType,
      title: section.title,
      passageText: section.passageText,
      // Auth-gated media routes, never the stored s3:// value.
      audioSrc: section.audioUrl ? `/api/practice/audio/${section.id}` : null,
      imageSrc: section.imageUrl ? `/api/practice/image/${section.id}` : null,
      groups: section.questions.groups.map((g) => ({
        questionType: g.questionType as QuestionTypeKey,
        instruction: g.instruction,
        from: g.from,
        to: g.to,
        layout: g.layout ?? null,
        items: g.items.map((i) => ({
          // Items live in the section's jsonb and have no uuid, so the exam
          // number on the answer sheet is their identity all the way through.
          key: String(i.n),
          n: i.n,
          marks: i.marks ?? 1,
          questionType: g.questionType as QuestionTypeKey,
          prompt: i.prompt ?? null,
          // Two different shapes travel in `content`: the options for a choice
          // item, and the CUE CARD for Speaking Part 2 — which IS the question
          // there, so dropping it left a record button with nothing above it.
          content:
            i.options || i.cueCard
              ? {
                  ...(i.options ? { options: i.options, selectCount: i.selectCount } : {}),
                  ...(i.cueCard ? { cueCard: i.cueCard } : {}),
                }
              : null,
          wordLimitMin: i.wordLimitMin ?? null,
          prepSeconds: i.prepSeconds ?? null,
          speakSeconds: i.speakSeconds ?? null,
        })),
      })),
    }),
    [section],
  );

  const bodyResults: BodyResult[] | null = useMemo(
    () =>
      results?.map((r) => ({
        key: String(r.n),
        isCorrect: r.isCorrect,
        correctAnswer: r.correctAnswer,
        explanation: r.explanation,
        earned: r.earned,
        marks: r.marks,
        your: r.your,
      })) ?? null,
    [results],
  );

  return (
    <QuestionBody
      doc={doc}
      answers={answers}
      results={bodyResults}
      // The shared body speaks in answer keys; this surface speaks in numbers.
      onAnswer={(key, value) => onAnswer(Number(key), value)}
      onClearAnswer={onClearAnswer ? (key) => onClearAnswer(Number(key)) : undefined}
      config={{
        slot,
        focusNumber,
        groupHeaders,
        // Per-group bands carry the instruction here, so no bar above the part.
        instructionText: null,
        anchorPrefix: "sq",
        // One recording serves every group below it, so it has to stay reachable.
        stickyAudio: true,
        // Lettered labelling gets the answer grid the real sheet uses.
        labelMatrix: true,
        inlineFeedback: true,
        reportOn: "feedback",
        // A section's layouts never claim the figure — a typed diagram prints
        // its numbers on the picture and lists the blanks beneath, so the figure
        // stays the part's stimulus.
        layoutFallbackImage: null,
        // Only a lettered labelling group draws the figure itself, and only then
        // does the stimulus block stand down.
        matrixImage: figureOwner >= 0 ? `/api/practice/image/${section.id}` : null,
        stimulusImage: figureOwner < 0,
      }}
    />
  );
}
