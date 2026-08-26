"use client";

import { useMemo } from "react";
import { QUESTION_TYPES, type QuestionTypeKey, type SectionKey } from "@/lib/ielts";
import { answerKey, numberFromKey, type Answer, type SetLayout } from "@/lib/question-content";
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
  showInstructions = true,
  answerScope,
  flagged,
  onToggleFlag,
  annotationScope,
}: {
  section: ClientSectionView;
  answers: Record<string, Answer>;
  results: SectionItemResult[] | null;
  onAnswer: (n: number, value: Answer) => void;
  onClearAnswer?: (n: number) => void;
  /**
   * What the caller's `answers` map is keyed by.
   *
   * Section practice sits ONE part, so an exam number is a unique key and this
   * is omitted. A mock paper holds twelve parts whose numbers collide, so it
   * keys by part id and passes it here — see `answerKey`.
   *
   * This is not cosmetic. The renderer indexes its inputs by these keys, so a
   * caller storing under `"<partId>:7"` while the body reads `"7"` produces the
   * worst possible failure: the answer sheet marks question 7 answered and the
   * input the candidate typed into shows nothing back.
   */
  answerScope?: string;
  /**
   * Questions marked "come back to this", keyed the same way as `answers`.
   *
   * Flagging is not a nicety — the real test has it because the winning strategy
   * in a timed paper is to leave a hard question and return, and without a mark
   * on the answer sheet you have to remember which one it was.
   */
  flagged?: Set<string>;
  onToggleFlag?: (n: number) => void;
  /**
   * Which attempt the passage highlights belong to. Omitted, the highlighter is
   * off — better no tool than one that shows a mock candidate their practice
   * notes, since the two surfaces share a passage's id.
   */
  annotationScope?: string;
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
  /**
   * Print each group's instruction line in that band.
   *
   * Defaults to on for the mock, which rehearses the real paper rubric and all.
   * Section PRACTICE passes false — see PRACTICE_INSTRUCTIONS_HIDDEN.
   */
  showInstructions?: boolean;
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
      // Already app-relative paths — toClientSection converts them so the
      // stored s3:// location never reaches the browser.
      audioSrc: section.audioUrl,
      imageSrc: section.imageUrl,
      groups: section.questions.groups.map((g) => ({
        questionType: g.questionType as QuestionTypeKey,
        instruction: g.instruction,
        from: g.from,
        to: g.to,
        layout: g.layout ?? null,
        items: g.items.map((i) => ({
          // Items live in the section's jsonb and have no uuid, so the exam
          // number on the answer sheet is their identity all the way through —
          // scoped by the part it belongs to when the caller holds more than one.
          key: answerKey(answerScope, i.n),
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
    [section, answerScope],
  );

  const bodyResults: BodyResult[] | null = useMemo(
    () =>
      results?.map((r) => ({
        key: answerKey(answerScope, r.n),
        isCorrect: r.isCorrect,
        correctAnswer: r.correctAnswer,
        explanation: r.explanation,
        earned: r.earned,
        marks: r.marks,
        your: r.your,
      })) ?? null,
    [results, answerScope],
  );

  return (
    <QuestionBody
      doc={doc}
      answers={answers}
      results={bodyResults}
      // The shared body speaks in answer keys; this surface speaks in numbers.
      onAnswer={(key, value) => onAnswer(numberFromKey(key), value)}
      onClearAnswer={onClearAnswer ? (key) => onClearAnswer(numberFromKey(key)) : undefined}
      config={{
        slot,
        focusNumber,
        groupHeaders,
        showInstructions,
        flagged,
        onToggleFlag: onToggleFlag ? (key) => onToggleFlag(numberFromKey(key)) : undefined,
        // Per-group bands carry the instruction here, so no bar above the part.
        instructionText: null,
        anchorPrefix: "sq",
        // Highlights are filed against the part, so they survive a re-render and
        // a move away and back within the same paper.
        passageId: section.id,
        passageScope: annotationScope,
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
        matrixImage: figureOwner >= 0 ? section.imageUrl : null,
        stimulusImage: figureOwner < 0,
      }}
    />
  );
}
